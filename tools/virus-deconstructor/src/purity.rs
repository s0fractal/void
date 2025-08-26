use swc_common::Span;
use swc_ecma_ast::*;
use swc_ecma_visit::{Visit, VisitWith};

#[derive(Debug, Clone)]
pub struct PureFunction {
    pub name: String,
    pub params: Vec<String>,
    pub return_type: Option<String>,
    pub span: Span,
    pub is_pure: bool,
}

pub struct PurityChecker {
    current_function: Option<PureFunction>,
    functions: Vec<PureFunction>,
    in_function: bool,
    has_side_effects: bool,
    external_refs: Vec<String>,
}

impl PurityChecker {
    pub fn new() -> Self {
        Self {
            current_function: None,
            functions: Vec::new(),
            in_function: false,
            has_side_effects: false,
            external_refs: Vec::new(),
        }
    }
    
    pub fn extract_pure_functions(&mut self, module: &Module) -> Vec<PureFunction> {
        module.visit_with(self);
        
        self.functions
            .iter()
            .filter(|f| f.is_pure)
            .cloned()
            .collect()
    }
    
    fn check_purity(&self) -> bool {
        !self.has_side_effects && self.external_refs.is_empty()
    }
    
    fn reset_state(&mut self) {
        self.has_side_effects = false;
        self.external_refs.clear();
    }
}

impl Visit for PurityChecker {
    fn visit_fn_decl(&mut self, node: &FnDecl) {
        self.reset_state();
        self.in_function = true;
        
        let name = node.ident.sym.to_string();
        let params: Vec<String> = node.function.params.iter()
            .filter_map(|p| match &p.pat {
                Pat::Ident(ident) => Some(ident.id.sym.to_string()),
                _ => None,
            })
            .collect();
        
        self.current_function = Some(PureFunction {
            name: name.clone(),
            params: params.clone(),
            return_type: None, // TODO: extract from TypeScript types
            span: node.function.span,
            is_pure: false,
        });
        
        // Visit function body
        node.function.visit_children_with(self);
        
        // Check if function is pure
        if let Some(mut func) = self.current_function.take() {
            func.is_pure = self.check_purity();
            self.functions.push(func);
        }
        
        self.in_function = false;
    }
    
    fn visit_fn_expr(&mut self, node: &FnExpr) {
        if !self.in_function {
            self.reset_state();
            self.in_function = true;
            
            let name = node.ident
                .as_ref()
                .map(|i| i.sym.to_string())
                .unwrap_or_else(|| "anonymous".to_string());
            
            let params: Vec<String> = node.function.params.iter()
                .filter_map(|p| match &p.pat {
                    Pat::Ident(ident) => Some(ident.id.sym.to_string()),
                    _ => None,
                })
                .collect();
            
            self.current_function = Some(PureFunction {
                name,
                params,
                return_type: None,
                span: node.function.span,
                is_pure: false,
            });
            
            node.function.visit_children_with(self);
            
            if let Some(mut func) = self.current_function.take() {
                func.is_pure = self.check_purity();
                self.functions.push(func);
            }
            
            self.in_function = false;
        }
    }
    
    fn visit_arrow_expr(&mut self, node: &ArrowExpr) {
        if !self.in_function {
            self.reset_state();
            self.in_function = true;
            
            let params: Vec<String> = node.params.iter()
                .filter_map(|p| match p {
                    Pat::Ident(ident) => Some(ident.id.sym.to_string()),
                    _ => None,
                })
                .collect();
            
            self.current_function = Some(PureFunction {
                name: "arrow".to_string(),
                params,
                return_type: None,
                span: node.span,
                is_pure: false,
            });
            
            node.visit_children_with(self);
            
            if let Some(mut func) = self.current_function.take() {
                func.is_pure = self.check_purity();
                if func.is_pure {
                    self.functions.push(func);
                }
            }
            
            self.in_function = false;
        }
    }
    
    // Detect side effects
    fn visit_call_expr(&mut self, node: &CallExpr) {
        if self.in_function {
            // Check for console.log, Math.random, Date.now, etc.
            if let Callee::Expr(expr) = &node.callee {
                match &**expr {
                    Expr::Member(member) => {
                        if let Expr::Ident(obj) = &*member.obj {
                            let obj_name = obj.sym.to_string();
                            if matches!(obj_name.as_str(), "console" | "Math" | "Date" | "window" | "document") {
                                self.has_side_effects = true;
                            }
                        }
                    }
                    Expr::Ident(ident) => {
                        let name = ident.sym.to_string();
                        if matches!(name.as_str(), "setTimeout" | "setInterval" | "fetch" | "require") {
                            self.has_side_effects = true;
                        }
                    }
                    _ => {}
                }
            }
        }
        
        node.visit_children_with(self);
    }
    
    // Check for mutations
    fn visit_assign_expr(&mut self, node: &AssignExpr) {
        if self.in_function {
            self.has_side_effects = true;
        }
        node.visit_children_with(self);
    }
    
    fn visit_update_expr(&mut self, node: &UpdateExpr) {
        if self.in_function {
            self.has_side_effects = true;
        }
        node.visit_children_with(self);
    }
    
    // Check for external references
    fn visit_ident(&mut self, node: &Ident) {
        if self.in_function {
            let name = node.sym.to_string();
            
            // Check if it's a parameter
            if let Some(func) = &self.current_function {
                if !func.params.contains(&name) {
                    // Not a parameter, might be external reference
                    // (In real implementation, need proper scope tracking)
                    if !is_builtin(&name) {
                        self.external_refs.push(name);
                    }
                }
            }
        }
    }
    
    // Detect async functions
    fn visit_await_expr(&mut self, node: &AwaitExpr) {
        if self.in_function {
            self.has_side_effects = true;
        }
        node.visit_children_with(self);
    }
}

fn is_builtin(name: &str) -> bool {
    matches!(name, 
        "undefined" | "null" | "true" | "false" | 
        "Array" | "Object" | "String" | "Number" | "Boolean" |
        "parseInt" | "parseFloat" | "isNaN" | "isFinite"
    )
}

#[cfg(test)]
mod tests {
    use super::*;
    use swc_common::sync::Lrc;
    use swc_common::SourceMap;
    use swc_ecma_parser::{lexer::Lexer, Parser, StringInput, Syntax};
    
    fn parse_module(code: &str) -> Module {
        let cm: Lrc<SourceMap> = Default::default();
        let fm = cm.new_source_file(
            swc_common::FileName::Anon,
            code.to_string(),
        );
        
        let lexer = Lexer::new(
            Syntax::Typescript(Default::default()),
            Default::default(),
            StringInput::from(&*fm),
            None,
        );
        
        let mut parser = Parser::new_from(lexer);
        parser.parse_module().unwrap()
    }
    
    #[test]
    fn test_pure_function() {
        let code = r#"
            function add(a, b) {
                return a + b;
            }
        "#;
        
        let module = parse_module(code);
        let mut checker = PurityChecker::new();
        let functions = checker.extract_pure_functions(&module);
        
        assert_eq!(functions.len(), 1);
        assert_eq!(functions[0].name, "add");
        assert!(functions[0].is_pure);
    }
    
    #[test]
    fn test_impure_console_log() {
        let code = r#"
            function logAndAdd(a, b) {
                console.log(a, b);
                return a + b;
            }
        "#;
        
        let module = parse_module(code);
        let mut checker = PurityChecker::new();
        let functions = checker.extract_pure_functions(&module);
        
        assert_eq!(functions.len(), 0); // Should be filtered out as impure
    }
}