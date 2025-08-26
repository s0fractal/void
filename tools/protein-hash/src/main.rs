use anyhow::{Context, Result};
use clap::{Parser, Subcommand};
use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use tracing::{info, warn};

mod ast;
mod compare;
mod graph;
mod normalize;
mod spectrum;

use crate::compare::compare_signatures;
use crate::spectrum::ProteinSignature;

#[derive(Parser, Debug)]
#[command(author, version, about = "Spectral code signatures for semantic equivalence")]
struct Cli {
    #[command(subcommand)]
    command: Commands,

    /// Number of eigenvalues to use
    #[arg(long, default_value = "16")]
    k: usize,

    /// Quantization precision (decimal places)
    #[arg(long, default_value = "6")]
    quant: u8,

    /// Enable debug output
    #[arg(long)]
    debug: bool,
}

#[derive(Subcommand, Debug)]
enum Commands {
    /// Compute signature for a single file
    Compute {
        /// Input TypeScript file
        file: PathBuf,
    },
    
    /// Compute signatures for all files in directory
    ComputeDir {
        /// Directory containing TypeScript files
        dir: PathBuf,
        
        /// Output as JSONL (one line per file)
        #[arg(long)]
        jsonl: bool,
    },
    
    /// Compare two files
    Compare {
        /// First file
        file1: PathBuf,
        
        /// Second file
        file2: PathBuf,
    },
    
    /// Patch manifest with phi signatures
    PatchManifest {
        /// Manifest JSON file
        manifest: PathBuf,
        
        /// Source JSONL with computed signatures
        src: PathBuf,
    },
}

#[derive(Serialize)]
struct ComputeResult {
    file: String,
    #[serde(rename = "astHash")]
    ast_hash: String,
    phi: PhiVector,
    stats: ComputeStats,
}

#[derive(Serialize)]
struct PhiVector {
    op: String,
    k: usize,
    quant: u8,
    values: Vec<f64>,
}

#[derive(Serialize)]
struct ComputeStats {
    nodes: usize,
    edges: usize,
    build_ms: u64,
}

#[derive(Serialize)]
struct CompareResult {
    cos: f64,
    rmse: f64,
}

fn init_logging(debug: bool) {
    let level = if debug { "debug" } else { "info" };
    tracing_subscriber::fmt()
        .with_env_filter(level)
        .with_target(false)
        .init();
}

#[tokio::main]
async fn main() -> Result<()> {
    let cli = Cli::parse();
    init_logging(cli.debug);
    
    // Check if protein hash is enabled
    if std::env::var("PROTEIN_HASH_ENABLED").unwrap_or_default() != "1" {
        warn!("Protein Hash is disabled. Set PROTEIN_HASH_ENABLED=1 to enable.");
        if !cli.debug {
            std::process::exit(0);
        }
    }
    
    match cli.command {
        Commands::Compute { file } => {
            let result = compute_file(&file, cli.k, cli.quant).await?;
            println!("{}", serde_json::to_string_pretty(&result)?);
        }
        
        Commands::ComputeDir { dir, jsonl } => {
            let results = compute_directory(&dir, cli.k, cli.quant).await?;
            
            if jsonl {
                for result in results {
                    println!("{}", serde_json::to_string(&result)?);
                }
            } else {
                println!("{}", serde_json::to_string_pretty(&results)?);
            }
        }
        
        Commands::Compare { file1, file2 } => {
            let sig1 = compute_signature(&file1, cli.k, cli.quant).await?;
            let sig2 = compute_signature(&file2, cli.k, cli.quant).await?;
            
            let result = CompareResult {
                cos: compare_signatures(&sig1, &sig2, compare::Metric::Cosine)?,
                rmse: compare_signatures(&sig1, &sig2, compare::Metric::Rmse)?,
            };
            
            println!("{}", serde_json::to_string(&result)?);
        }
        
        Commands::PatchManifest { manifest, src } => {
            patch_manifest(&manifest, &src).await?;
            info!("Manifest patched successfully");
        }
    }
    
    Ok(())
}

async fn compute_file(path: &PathBuf, k: usize, quant: u8) -> Result<ComputeResult> {
    let start = std::time::Instant::now();
    
    // Read file
    let content = tokio::fs::read_to_string(path)
        .await
        .context("Failed to read file")?;
    
    // Parse AST
    let ast = ast::parse_typescript(&content)?;
    
    // Normalize
    let normalized = normalize::normalize_ast(ast)?;
    
    // Compute AST hash
    let ast_hash = ast::compute_hash(&normalized)?;
    
    // Build graph
    let (graph_data, stats) = graph::build_graph(&normalized)?;
    
    // Compute spectrum
    let signature = spectrum::compute_signature(graph_data, k, quant)?;
    
    let build_ms = start.elapsed().as_millis() as u64;
    
    Ok(ComputeResult {
        file: path.display().to_string(),
        ast_hash,
        phi: PhiVector {
            op: "laplacian".to_string(),
            k,
            quant,
            values: signature.values,
        },
        stats: ComputeStats {
            nodes: stats.nodes,
            edges: stats.edges,
            build_ms,
        },
    })
}

async fn compute_signature(path: &PathBuf, k: usize, quant: u8) -> Result<ProteinSignature> {
    let content = tokio::fs::read_to_string(path).await?;
    let ast = ast::parse_typescript(&content)?;
    let normalized = normalize::normalize_ast(ast)?;
    let (graph_data, _) = graph::build_graph(&normalized)?;
    spectrum::compute_signature(graph_data, k, quant)
}

async fn compute_directory(dir: &PathBuf, k: usize, quant: u8) -> Result<Vec<ComputeResult>> {
    use walkdir::WalkDir;
    
    let mut tasks = vec![];
    
    for entry in WalkDir::new(dir)
        .follow_links(true)
        .into_iter()
        .filter_map(|e| e.ok())
    {
        let path = entry.path();
        if path.is_file() && path.extension().map_or(false, |ext| ext == "ts") {
            let path = path.to_path_buf();
            tasks.push(tokio::spawn(async move {
                compute_file(&path, k, quant).await
            }));
        }
    }
    
    let mut results = vec![];
    for task in tasks {
        match task.await {
            Ok(Ok(result)) => results.push(result),
            Ok(Err(e)) => warn!("Failed to compute: {}", e),
            Err(e) => warn!("Task failed: {}", e),
        }
    }
    
    Ok(results)
}

async fn patch_manifest(manifest_path: &PathBuf, src_path: &PathBuf) -> Result<()> {
    use std::collections::HashMap;
    
    // Read signatures from JSONL
    let content = tokio::fs::read_to_string(src_path).await?;
    let mut signatures: HashMap<String, ComputeResult> = HashMap::new();
    
    for line in content.lines() {
        if let Ok(result) = serde_json::from_str::<ComputeResult>(line) {
            // Extract filename without extension
            let name = PathBuf::from(&result.file)
                .file_stem()
                .unwrap_or_default()
                .to_string_lossy()
                .to_string();
            signatures.insert(name, result);
        }
    }
    
    // Read manifest
    let manifest_content = tokio::fs::read_to_string(manifest_path).await?;
    let mut manifest: serde_json::Value = serde_json::from_str(&manifest_content)?;
    
    // Patch genes with phi
    if let Some(genes) = manifest["genes"].as_array_mut() {
        for gene in genes {
            if let Some(name) = gene["name"].as_str() {
                if let Some(sig) = signatures.get(name) {
                    gene["phi"] = serde_json::to_value(&sig.phi)?;
                    gene["astHash"] = serde_json::Value::String(sig.ast_hash.clone());
                }
            }
        }
    }
    
    // Write back
    let output = serde_json::to_string_pretty(&manifest)?;
    tokio::fs::write(manifest_path, output).await?;
    
    Ok(())
}