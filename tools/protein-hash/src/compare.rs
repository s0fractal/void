use anyhow::{bail, Result};
use crate::spectrum::ProteinSignature;

pub enum Metric {
    Cosine,
    Rmse,
}

pub fn compare_signatures(sig1: &ProteinSignature, sig2: &ProteinSignature, metric: Metric) -> Result<f64> {
    if sig1.values.len() != sig2.values.len() {
        bail!(
            "Signature length mismatch: {} vs {}",
            sig1.values.len(),
            sig2.values.len()
        );
    }
    
    match metric {
        Metric::Cosine => cosine_similarity(&sig1.values, &sig2.values),
        Metric::Rmse => rmse(&sig1.values, &sig2.values),
    }
}

fn cosine_similarity(a: &[f64], b: &[f64]) -> Result<f64> {
    let dot_product: f64 = a.iter().zip(b.iter()).map(|(x, y)| x * y).sum();
    let norm_a: f64 = a.iter().map(|x| x * x).sum::<f64>().sqrt();
    let norm_b: f64 = b.iter().map(|x| x * x).sum::<f64>().sqrt();
    
    if norm_a == 0.0 || norm_b == 0.0 {
        // Handle zero vectors
        if norm_a == 0.0 && norm_b == 0.0 {
            return Ok(1.0); // Both zero vectors are identical
        }
        return Ok(0.0); // One is zero, they're orthogonal
    }
    
    Ok(dot_product / (norm_a * norm_b))
}

fn rmse(a: &[f64], b: &[f64]) -> Result<f64> {
    let n = a.len() as f64;
    let sum_squared_diff: f64 = a.iter()
        .zip(b.iter())
        .map(|(x, y)| (x - y).powi(2))
        .sum();
    
    Ok((sum_squared_diff / n).sqrt())
}

pub fn classify_similarity(cosine: f64) -> &'static str {
    if cosine >= 0.985 {
        "equivalent"
    } else if cosine >= 0.95 {
        "very_similar"
    } else if cosine >= 0.85 {
        "similar"
    } else {
        "different"
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn make_signature(values: Vec<f64>) -> ProteinSignature {
        ProteinSignature {
            values,
            k: values.len(),
            quant: 6,
        }
    }

    #[test]
    fn test_cosine_identical() {
        let sig1 = make_signature(vec![1.0, 2.0, 3.0]);
        let sig2 = make_signature(vec![1.0, 2.0, 3.0]);
        
        let cos = compare_signatures(&sig1, &sig2, Metric::Cosine).unwrap();
        assert!((cos - 1.0).abs() < 1e-10);
    }
    
    #[test]
    fn test_cosine_orthogonal() {
        let sig1 = make_signature(vec![1.0, 0.0]);
        let sig2 = make_signature(vec![0.0, 1.0]);
        
        let cos = compare_signatures(&sig1, &sig2, Metric::Cosine).unwrap();
        assert!(cos.abs() < 1e-10);
    }
    
    #[test]
    fn test_rmse_identical() {
        let sig1 = make_signature(vec![1.0, 2.0, 3.0]);
        let sig2 = make_signature(vec![1.0, 2.0, 3.0]);
        
        let rmse = compare_signatures(&sig1, &sig2, Metric::Rmse).unwrap();
        assert!(rmse < 1e-10);
    }
    
    #[test]
    fn test_classify_similarity() {
        assert_eq!(classify_similarity(0.99), "equivalent");
        assert_eq!(classify_similarity(0.96), "very_similar");
        assert_eq!(classify_similarity(0.90), "similar");
        assert_eq!(classify_similarity(0.80), "different");
    }
}