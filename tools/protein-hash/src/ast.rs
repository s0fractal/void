use anyhow::{Context, Result};
use sha2::{Digest, Sha256};
use swc_common::{sync::Lrc, FileName, SourceMap};
use swc_ecma_ast::{Module, Program};
use swc_ecma_parser::{lexer::Lexer, Parser, StringInput, Syntax, TsConfig};

pub fn parse_typescript(source: &str) -> Result<Module> {
    let cm: Lrc<SourceMap> = Default::default();
    let fm = cm.new_source_file(FileName::Custom("input.ts".into()), source.into());
    
    let lexer = Lexer::new(
        Syntax::Typescript(TsConfig {
            tsx: false,
            decorators: true,
            ..Default::default()
        }),
        Default::default(),
        StringInput::from(&*fm),
        None,
    );
    
    let mut parser = Parser::new_from(lexer);
    
    match parser.parse_program() {
        Ok(Program::Module(module)) => Ok(module),
        Ok(Program::Script(_)) => anyhow::bail!("Expected module, got script"),
        Err(err) => anyhow::bail!("Parse error: {:?}", err),
    }
}

pub fn compute_hash(module: &Module) -> Result<String> {
    // Serialize AST to stable format
    let json = serde_json::to_string(module)
        .context("Failed to serialize AST")?;
    
    // Compute SHA256
    let mut hasher = Sha256::new();
    hasher.update(json.as_bytes());
    let hash = hasher.finalize();
    
    Ok(format!("sha256:{}", hex::encode(hash)))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_parse_simple_function() {
        let source = r#"
            export function add(a: number, b: number): number {
                return a + b;
            }
        "#;
        
        let module = parse_typescript(source).unwrap();
        assert_eq!(module.body.len(), 1);
    }
    
    #[test]
    fn test_hash_stability() {
        let source = "export function id(x: any) { return x; }";
        let module1 = parse_typescript(source).unwrap();
        let module2 = parse_typescript(source).unwrap();
        
        let hash1 = compute_hash(&module1).unwrap();
        let hash2 = compute_hash(&module2).unwrap();
        
        assert_eq!(hash1, hash2);
    }
}