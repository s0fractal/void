use anyhow::Result;
use clap::{Parser, Subcommand};
use serde::{Deserialize, Serialize};
use std::io::Write;
use std::path::{Path, PathBuf};
use swc_common::{sync::Lrc, SourceMap};
use swc_ecma_parser::{lexer::Lexer, Parser as SwcParser, StringInput, Syntax};
use tracing::{info, warn};
use walkdir::WalkDir;

mod purity;
use purity::PurityChecker;

#[derive(Parser)]
#[command(name = "virus-deconstructor")]
#[command(version = "0.1.0")]
#[command(about = "Extract pure functions from JS/TS code", long_about = None)]
struct Cli {
    #[command(subcommand)]
    command: Commands,
}

#[derive(Subcommand)]
enum Commands {
    /// Scan directory for pure functions
    Scan {
        /// Root directory to scan
        #[arg(short, long)]
        root: PathBuf,
        
        /// Output manifest path
        #[arg(short, long)]
        out: PathBuf,
        
        /// Include TypeScript files
        #[arg(long, default_value = "true")]
        typescript: bool,
        
        /// Max depth for directory traversal
        #[arg(long, default_value = "10")]
        max_depth: usize,
    },
}

#[derive(Debug, Serialize, Deserialize)]
struct GenManifest {
    name: String,
    hash: String,
    ast_hash: String,
    path: String,
    line: u32,
    pure: bool,
    params: Vec<String>,
    return_type: Option<String>,
    body: String,
}

fn main() -> Result<()> {
    tracing_subscriber::fmt::init();
    
    let cli = Cli::parse();
    
    match cli.command {
        Commands::Scan { root, out, typescript, max_depth } => {
            scan_directory(&root, &out, typescript, max_depth)?;
        }
    }
    
    Ok(())
}

fn scan_directory(root: &Path, out: &Path, typescript: bool, max_depth: usize) -> Result<()> {
    info!("🦠 Virus-Deconstructor starting scan...");
    info!("Root: {:?}", root);
    
    let mut genes = Vec::new();
    let cm: Lrc<SourceMap> = Default::default();
    
    for entry in WalkDir::new(root)
        .max_depth(max_depth)
        .into_iter()
        .filter_map(|e| e.ok())
    {
        let path = entry.path();
        
        // Check if it's a JS/TS file
        if !is_js_ts_file(path, typescript) {
            continue;
        }
        
        info!("Scanning: {:?}", path);
        
        match scan_file(&cm, path) {
            Ok(mut file_genes) => {
                genes.append(&mut file_genes);
            }
            Err(e) => {
                warn!("Failed to scan {:?}: {}", path, e);
            }
        }
    }
    
    info!("Found {} pure functions", genes.len());
    
    // Write NDJSON manifest
    let mut file = std::fs::File::create(out)?;
    for gene in genes {
        let json = serde_json::to_string(&gene)?;
        writeln!(file, "{}", json)?;
    }
    
    info!("✅ Manifest written to: {:?}", out);
    
    Ok(())
}

fn is_js_ts_file(path: &Path, typescript: bool) -> bool {
    if let Some(ext) = path.extension() {
        let ext = ext.to_string_lossy();
        match ext.as_ref() {
            "js" | "mjs" | "cjs" => true,
            "ts" | "tsx" => typescript,
            _ => false,
        }
    } else {
        false
    }
}

fn scan_file(cm: &Lrc<SourceMap>, path: &Path) -> Result<Vec<GenManifest>> {
    let content = std::fs::read_to_string(path)?;
    let fm = cm.new_source_file(
        swc_common::FileName::Real(path.to_path_buf()),
        content.clone(),
    );
    
    let lexer = Lexer::new(
        Syntax::Typescript(Default::default()),
        Default::default(),
        StringInput::from(&*fm),
        None,
    );
    
    let mut parser = SwcParser::new_from(lexer);
    let module = parser.parse_module()?;
    
    let mut checker = PurityChecker::new();
    let functions = checker.extract_pure_functions(&module);
    
    let mut genes = Vec::new();
    
    for func in functions {
        let body = content[func.span.lo.0 as usize..func.span.hi.0 as usize].to_string();
        let hash = compute_content_hash(&body);
        let ast_hash = compute_ast_hash(&func);
        
        genes.push(GenManifest {
            name: func.name.clone(),
            hash,
            ast_hash,
            path: path.to_string_lossy().to_string(),
            line: cm.lookup_line(func.span.lo).unwrap_or(0) as u32 + 1,
            pure: true,
            params: func.params.clone(),
            return_type: func.return_type.clone(),
            body,
        });
    }
    
    Ok(genes)
}

fn compute_content_hash(content: &str) -> String {
    use sha2::{Sha256, Digest};
    let mut hasher = Sha256::new();
    hasher.update(content.as_bytes());
    let result = hasher.finalize();
    format!("sha256:{}", hex::encode(result))
}

fn compute_ast_hash(func: &purity::PureFunction) -> String {
    // Simplified canonical AST hash
    // In real implementation, normalize AST structure
    use sha2::{Sha256, Digest};
    let mut hasher = Sha256::new();
    
    hasher.update(func.name.as_bytes());
    for param in &func.params {
        hasher.update(param.as_bytes());
    }
    if let Some(rt) = &func.return_type {
        hasher.update(rt.as_bytes());
    }
    
    let result = hasher.finalize();
    format!("canonical:{}", hex::encode(result))
}

#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn test_content_hash() {
        let content = "function add(a, b) { return a + b; }";
        let hash = compute_content_hash(content);
        assert!(hash.starts_with("sha256:"));
    }
}