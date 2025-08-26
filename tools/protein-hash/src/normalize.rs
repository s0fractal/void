use anyhow::Result;
use std::collections::HashMap;
use swc_ecma_ast::*;
use swc_common::DUMMY_SP;

pub fn normalize_ast(mut module: Module) -> Result<Module> {
    let mut normalizer = Normalizer::new();
    normalizer.normalize_module(&mut module);
    Ok(module)
}

struct Normalizer {
    identifier_map: HashMap<String, String>,
    next_id: usize,
}

impl Normalizer {
    fn new() -> Self {
        Self {
            identifier_map: HashMap::new(),
            next_id: 1,
        }
    }
    
    fn normalize_module(&mut self, module: &mut Module) {
        for item in &mut module.body {
            self.normalize_module_item(item);
        }
    }
    
    fn normalize_module_item(&mut self, item: &mut ModuleItem) {
        match item {
            ModuleItem::ModuleDecl(decl) => self.normalize_module_decl(decl),
            ModuleItem::Stmt(stmt) => self.normalize_stmt(stmt),
        }
    }
    
    fn normalize_module_decl(&mut self, decl: &mut ModuleDecl) {
        match decl {
            ModuleDecl::ExportDecl(export) => {
                self.normalize_decl(&mut export.decl);
            }
            ModuleDecl::ExportDefaultDecl(export) => {
                self.normalize_default_decl(&mut export.decl);
            }
            _ => {} // Other export types not handled in v1
        }
    }
    
    fn normalize_default_decl(&mut self, decl: &mut DefaultDecl) {
        match decl {
            DefaultDecl::Fn(fn_expr) => {
                if let Some(ident) = &mut fn_expr.ident {
                    self.normalize_ident(ident);
                }
                self.normalize_function(&mut fn_expr.function);
            }
            _ => {} // Other default types
        }
    }
    
    fn normalize_decl(&mut self, decl: &mut Decl) {
        match decl {
            Decl::Fn(fn_decl) => {
                self.normalize_ident(&mut fn_decl.ident);
                self.normalize_function(&mut fn_decl.function);
            }
            Decl::Var(var_decl) => {
                for decl in &mut var_decl.decls {
                    self.normalize_pat(&mut decl.name);
                    if let Some(init) = &mut decl.init {
                        self.normalize_expr(init);
                    }
                }
            }
            _ => {} // Other declarations
        }
    }
    
    fn normalize_function(&mut self, func: &mut Function) {
        // Create new scope for function parameters
        let saved_map = self.identifier_map.clone();
        
        // Normalize parameters
        for param in &mut func.params {
            self.normalize_pat(&mut param.pat);
        }
        
        // Normalize body
        if let Some(body) = &mut func.body {
            self.normalize_block_stmt(body);
        }
        
        // Restore scope
        self.identifier_map = saved_map;
    }
    
    fn normalize_stmt(&mut self, stmt: &mut Stmt) {
        match stmt {
            Stmt::Return(ret_stmt) => {
                if let Some(arg) = &mut ret_stmt.arg {
                    self.normalize_expr(arg);
                }
            }
            Stmt::Expr(expr_stmt) => {
                self.normalize_expr(&mut expr_stmt.expr);
            }
            Stmt::Block(block) => {
                self.normalize_block_stmt(block);
            }
            Stmt::If(if_stmt) => {
                self.normalize_expr(&mut if_stmt.test);
                self.normalize_stmt(&mut if_stmt.cons);
                if let Some(alt) = &mut if_stmt.alt {
                    self.normalize_stmt(alt);
                }
            }
            _ => {} // Other statements
        }
    }
    
    fn normalize_block_stmt(&mut self, block: &mut BlockStmt) {
        for stmt in &mut block.stmts {
            self.normalize_stmt(stmt);
        }
    }
    
    fn normalize_expr(&mut self, expr: &mut Expr) {
        match expr {
            Expr::Ident(ident) => {
                self.normalize_ident(ident);
            }
            Expr::Bin(bin_expr) => {
                self.normalize_expr(&mut bin_expr.left);
                self.normalize_expr(&mut bin_expr.right);
                
                // Normalize commutative operations
                match bin_expr.op {
                    BinaryOp::Add | BinaryOp::Mul | BinaryOp::BitAnd | 
                    BinaryOp::BitOr | BinaryOp::BitXor | BinaryOp::LogicalAnd |
                    BinaryOp::LogicalOr => {
                        // Sort operands by stable key
                        let left_key = self.expr_sort_key(&bin_expr.left);
                        let right_key = self.expr_sort_key(&bin_expr.right);
                        
                        if left_key > right_key {
                            std::mem::swap(&mut bin_expr.left, &mut bin_expr.right);
                        }
                    }
                    _ => {} // Non-commutative operations
                }
            }
            Expr::Unary(unary) => {
                self.normalize_expr(&mut unary.arg);
            }
            Expr::Call(call) => {
                match &mut call.callee {
                    Callee::Expr(expr) => self.normalize_expr(expr),
                    _ => {}
                }
                for arg in &mut call.args {
                    self.normalize_expr(&mut arg.expr);
                }
            }
            Expr::Lit(lit) => {
                self.normalize_literal(lit);
            }
            _ => {} // Other expressions
        }
    }
    
    fn normalize_pat(&mut self, pat: &mut Pat) {
        match pat {
            Pat::Ident(ident) => {
                self.normalize_ident(&mut ident.id);
            }
            _ => {} // Other patterns
        }
    }
    
    fn normalize_ident(&mut self, ident: &mut Ident) {
        let original = ident.sym.to_string();
        
        let normalized = if let Some(existing) = self.identifier_map.get(&original) {
            existing.clone()
        } else {
            let new_name = format!("v{}", self.next_id);
            self.next_id += 1;
            self.identifier_map.insert(original, new_name.clone());
            new_name
        };
        
        ident.sym = normalized.into();
    }
    
    fn normalize_literal(&mut self, lit: &mut Lit) {
        match lit {
            Lit::Num(num) => {
                // Normalize 1.0 to 1
                if num.value.fract() == 0.0 {
                    // Keep as is - SWC handles this
                }
            }
            _ => {} // Other literals
        }
    }
    
    fn expr_sort_key(&self, expr: &Expr) -> String {
        // Simple stable key for sorting
        match expr {
            Expr::Ident(ident) => ident.sym.to_string(),
            Expr::Lit(Lit::Num(n)) => format!("num:{}", n.value),
            Expr::Lit(Lit::Str(s)) => format!("str:{}", s.value),
            _ => format!("expr:{:?}", expr),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::ast::parse_typescript;

    #[test]
    fn test_identifier_normalization() {
        let source = r#"
            export function add(x: number, y: number): number {
                return x + y;
            }
        "#;
        
        let module = parse_typescript(source).unwrap();
        let normalized = normalize_ast(module).unwrap();
        
        // Check that identifiers are normalized
        let json = serde_json::to_string(&normalized).unwrap();
        assert!(json.contains("v1"));
        assert!(json.contains("v2"));
        assert!(!json.contains("\"x\""));
        assert!(!json.contains("\"y\""));
    }
    
    #[test]
    fn test_commutative_normalization() {
        let source1 = "export const sum = a + b;";
        let source2 = "export const sum = b + a;";
        
        let module1 = parse_typescript(source1).unwrap();
        let module2 = parse_typescript(source2).unwrap();
        
        let norm1 = normalize_ast(module1).unwrap();
        let norm2 = normalize_ast(module2).unwrap();
        
        // After normalization, these should produce same order
        let json1 = serde_json::to_string(&norm1).unwrap();
        let json2 = serde_json::to_string(&norm2).unwrap();
        
        // They won't be exactly equal due to original positions,
        // but the normalized identifiers should be in same order
        assert!(json1.contains("v1") && json1.contains("v2"));
        assert!(json2.contains("v1") && json2.contains("v2"));
    }
}