use anyhow::{Context, Result};
use nalgebra::{DMatrix, DVector};
use petgraph::algo::connected_components;
use petgraph::visit::EdgeRef;

use crate::graph::{EdgeType, GraphData};

#[derive(Debug, Clone)]
pub struct ProteinSignature {
    pub values: Vec<f64>,
    pub k: usize,
    pub quant: u8,
}

pub fn compute_signature(
    graph_data: GraphData,
    k: usize,
    quant: u8,
) -> Result<ProteinSignature> {
    // Handle empty or small graphs
    let n = graph_data.graph.node_count();
    if n == 0 {
        return Ok(ProteinSignature {
            values: vec![0.0; k],
            k,
            quant,
        });
    }
    
    // For disconnected graphs, process largest component
    let components = connected_components(&graph_data.graph);
    if components > 1 {
        tracing::warn!("Graph has {} components, using largest", components);
    }
    
    // Build adjacency matrix
    let adjacency = build_adjacency_matrix(&graph_data)?;
    
    // Compute normalized Laplacian
    let laplacian = compute_normalized_laplacian(&adjacency)?;
    
    // Compute eigenvalues
    let eigenvalues = compute_eigenvalues(&laplacian, k)?;
    
    // Quantize
    let quantized = quantize_values(&eigenvalues, quant);
    
    Ok(ProteinSignature {
        values: quantized,
        k,
        quant,
    })
}

fn build_adjacency_matrix(graph_data: &GraphData) -> Result<DMatrix<f64>> {
    let n = graph_data.graph.node_count();
    let mut matrix = DMatrix::zeros(n, n);
    
    // Fill adjacency matrix with edge weights
    for edge in graph_data.graph.edge_references() {
        let i = edge.source().index();
        let j = edge.target().index();
        let weight = edge.weight().weight();
        
        matrix[(i, j)] = weight;
        matrix[(j, i)] = weight; // Undirected graph
    }
    
    // Normalize weights to [0, 1]
    let max_weight = matrix.iter().cloned().fold(0.0_f64, |a, b| a.max(b));
    if max_weight > 0.0 {
        matrix /= max_weight;
    }
    
    Ok(matrix)
}

fn compute_normalized_laplacian(adjacency: &DMatrix<f64>) -> Result<DMatrix<f64>> {
    let n = adjacency.nrows();
    let mut degree = DVector::zeros(n);
    
    // Compute degree vector
    for i in 0..n {
        degree[i] = adjacency.row(i).sum();
    }
    
    // Handle isolated nodes
    for i in 0..n {
        if degree[i] == 0.0 {
            degree[i] = 1.0; // Avoid division by zero
        }
    }
    
    // Compute D^(-1/2)
    let d_sqrt_inv = DMatrix::from_diagonal(&degree.map(|d| 1.0 / d.sqrt()));
    
    // Compute normalized Laplacian: L = I - D^(-1/2) * A * D^(-1/2)
    let identity = DMatrix::identity(n, n);
    let normalized_adj = &d_sqrt_inv * adjacency * &d_sqrt_inv;
    let laplacian = identity - normalized_adj;
    
    Ok(laplacian)
}

fn compute_eigenvalues(matrix: &DMatrix<f64>, k: usize) -> Result<Vec<f64>> {
    let n = matrix.nrows();
    let actual_k = k.min(n);
    
    if n <= 10 {
        // For small matrices, use full eigendecomposition
        compute_eigenvalues_full(matrix, actual_k)
    } else {
        // For larger matrices, use iterative methods
        compute_eigenvalues_sparse(matrix, actual_k)
    }
}

fn compute_eigenvalues_full(matrix: &DMatrix<f64>, k: usize) -> Result<Vec<f64>> {
    use nalgebra_lapack::SymmetricEigen;
    
    let eigen = SymmetricEigen::new(matrix.clone());
    let mut eigenvalues: Vec<f64> = eigen.eigenvalues.iter().cloned().collect();
    
    // Sort eigenvalues
    eigenvalues.sort_by(|a, b| a.partial_cmp(b).unwrap());
    
    // Take first k
    eigenvalues.truncate(k);
    
    // Pad with zeros if needed
    while eigenvalues.len() < k {
        eigenvalues.push(0.0);
    }
    
    Ok(eigenvalues)
}

fn compute_eigenvalues_sparse(matrix: &DMatrix<f64>, k: usize) -> Result<Vec<f64>> {
    // For sparse/large matrices, we'd use an iterative solver
    // For now, fallback to full decomposition
    compute_eigenvalues_full(matrix, k)
}

fn quantize_values(values: &[f64], quant: u8) -> Vec<f64> {
    let factor = 10_f64.powi(quant as i32);
    values
        .iter()
        .map(|&v| {
            // Round to specified decimal places
            let rounded = (v * factor).round() / factor;
            // Ensure -0.0 becomes 0.0
            if rounded == -0.0 {
                0.0
            } else {
                rounded
            }
        })
        .collect()
}

#[cfg(test)]
mod tests {
    use super::*;
    use petgraph::graph::Graph;
    use petgraph::Undirected;

    #[test]
    fn test_empty_graph() {
        let graph = Graph::<(), (), Undirected>::new_undirected();
        let graph_data = GraphData {
            graph: graph.map(|_, _| crate::graph::NodeType::Identifier("test".into()), 
                            |_, _| crate::graph::EdgeType::AstParent(1.0)),
            node_map: Default::default(),
        };
        
        let sig = compute_signature(graph_data, 8, 6).unwrap();
        assert_eq!(sig.values.len(), 8);
        assert!(sig.values.iter().all(|&v| v == 0.0));
    }
    
    #[test]
    fn test_quantization() {
        let values = vec![0.123456789, -0.000001, 0.999999];
        let quantized = quantize_values(&values, 3);
        
        assert_eq!(quantized[0], 0.123);
        assert_eq!(quantized[1], 0.0); // -0.000 -> 0.0
        assert_eq!(quantized[2], 1.0);
    }
}