use anyhow::Result;
use petgraph::graph::{Graph, NodeIndex};
use petgraph::Undirected;
use std::collections::HashMap;
use swc_ecma_ast::*;

pub struct GraphData {
    pub graph: Graph<NodeType, EdgeType, Undirected>,
    pub node_map: HashMap<String, NodeIndex>,
}

pub struct GraphStats {
    pub nodes: usize,
    pub edges: usize,
}

#[derive(Debug, Clone)]
pub enum NodeType {
    Function(String),
    Param(String),
    Return,
    Binary(BinaryOp),
    Unary(UnaryOp),
    Call(String),
    Identifier(String),
    Literal(LitType),
    If,
    Block,
}

#[derive(Debug, Clone)]
pub enum LitType {
    Num(f64),
    Str(String),
    Bool(bool),
}

#[derive(Debug, Clone)]
pub enum EdgeType {
    AstParent(f64),    // AST structure
    DataFlow(f64),     // def-use
    CallEdge(f64),     // function calls
}

impl EdgeType {
    fn weight(&self) -> f64 {
        match self {
            EdgeType::AstParent(w) => *w,
            EdgeType::DataFlow(w) => *w,
            EdgeType::CallEdge(w) => *w,
        }
    }
}

pub fn build_graph(module: &Module) -> Result<(GraphData, GraphStats)> {
    let mut builder = GraphBuilder::new();
    builder.build_module(module);
    
    let stats = GraphStats {
        nodes: builder.graph.node_count(),
        edges: builder.graph.edge_count(),
    };
    
    Ok((builder.into_graph_data(), stats))
}

struct GraphBuilder {
    graph: Graph<NodeType, EdgeType, Undirected>,
    node_map: HashMap<String, NodeIndex>,
    def_map: HashMap<String, NodeIndex>, // variable definitions
    next_node_id: usize,
}

impl GraphBuilder {
    fn new() -> Self {
        Self {
            graph: Graph::new_undirected(),
            node_map: HashMap::new(),
            def_map: HashMap::new(),
            next_node_id: 0,
        }
    }
    
    fn into_graph_data(self) -> GraphData {
        GraphData {
            graph: self.graph,
            node_map: self.node_map,
        }
    }
    
    fn add_node(&mut self, node_type: NodeType) -> NodeIndex {
        let idx = self.graph.add_node(node_type);
        self.next_node_id += 1;
        idx
    }
    
    fn add_edge(&mut self, a: NodeIndex, b: NodeIndex, edge_type: EdgeType) {
        self.graph.add_edge(a, b, edge_type);
    }
    
    fn build_module(&mut self, module: &Module) {
        for item in &module.body {
            self.build_module_item(item, None);
        }
    }
    
    fn build_module_item(&mut self, item: &ModuleItem, parent: Option<NodeIndex>) {
        match item {
            ModuleItem::ModuleDecl(decl) => self.build_module_decl(decl, parent),
            ModuleItem::Stmt(stmt) => self.build_stmt(stmt, parent),
        }
    }
    
    fn build_module_decl(&mut self, decl: &ModuleDecl, parent: Option<NodeIndex>) {
        match decl {
            ModuleDecl::ExportDecl(export) => {
                self.build_decl(&export.decl, parent);
            }
            ModuleDecl::ExportDefaultDecl(export) => {
                self.build_default_decl(&export.decl, parent);
            }
            _ => {}
        }
    }
    
    fn build_default_decl(&mut self, decl: &DefaultDecl, parent: Option<NodeIndex>) {
        match decl {
            DefaultDecl::Fn(fn_expr) => {
                let name = fn_expr.ident.as_ref()
                    .map(|i| i.sym.to_string())
                    .unwrap_or_else(|| "anonymous".to_string());
                self.build_function(&name, &fn_expr.function, parent);
            }
            _ => {}
        }
    }
    
    fn build_decl(&mut self, decl: &Decl, parent: Option<NodeIndex>) {
        match decl {
            Decl::Fn(fn_decl) => {
                let name = fn_decl.ident.sym.to_string();
                self.build_function(&name, &fn_decl.function, parent);
            }
            Decl::Var(var_decl) => {
                for decl in &var_decl.decls {
                    self.build_var_declarator(decl, parent);
                }
            }
            _ => {}
        }
    }
    
    fn build_function(&mut self, name: &str, func: &Function, parent: Option<NodeIndex>) {
        let func_node = self.add_node(NodeType::Function(name.to_string()));
        
        if let Some(p) = parent {
            self.add_edge(p, func_node, EdgeType::AstParent(1.0));
        }
        
        // Add to def map for calls
        self.def_map.insert(name.to_string(), func_node);
        
        // Build parameters
        for param in &func.params {
            self.build_param(&param.pat, Some(func_node));
        }
        
        // Build body
        if let Some(body) = &func.body {
            self.build_block_stmt(body, Some(func_node));
        }
    }
    
    fn build_param(&mut self, pat: &Pat, parent: Option<NodeIndex>) {
        match pat {
            Pat::Ident(ident) => {
                let name = ident.id.sym.to_string();
                let param_node = self.add_node(NodeType::Param(name.clone()));
                
                if let Some(p) = parent {
                    self.add_edge(p, param_node, EdgeType::AstParent(1.0));
                }
                
                // Record definition
                self.def_map.insert(name, param_node);
            }
            _ => {}
        }
    }
    
    fn build_var_declarator(&mut self, decl: &VarDeclarator, parent: Option<NodeIndex>) {
        if let Pat::Ident(ident) = &decl.name {
            let name = ident.id.sym.to_string();
            let var_node = self.add_node(NodeType::Identifier(name.clone()));
            
            if let Some(p) = parent {
                self.add_edge(p, var_node, EdgeType::AstParent(1.0));
            }
            
            self.def_map.insert(name, var_node);
            
            if let Some(init) = &decl.init {
                let init_node = self.build_expr(init, Some(var_node));
                self.add_edge(var_node, init_node, EdgeType::DataFlow(2.0));
            }
        }
    }
    
    fn build_stmt(&mut self, stmt: &Stmt, parent: Option<NodeIndex>) -> Option<NodeIndex> {
        match stmt {
            Stmt::Return(ret_stmt) => {
                let ret_node = self.add_node(NodeType::Return);
                
                if let Some(p) = parent {
                    self.add_edge(p, ret_node, EdgeType::AstParent(1.0));
                }
                
                if let Some(arg) = &ret_stmt.arg {
                    let arg_node = self.build_expr(arg, Some(ret_node));
                    self.add_edge(ret_node, arg_node, EdgeType::DataFlow(2.0));
                }
                
                Some(ret_node)
            }
            Stmt::Expr(expr_stmt) => {
                Some(self.build_expr(&expr_stmt.expr, parent))
            }
            Stmt::Block(block) => {
                self.build_block_stmt(block, parent);
                None
            }
            Stmt::If(if_stmt) => {
                let if_node = self.add_node(NodeType::If);
                
                if let Some(p) = parent {
                    self.add_edge(p, if_node, EdgeType::AstParent(1.0));
                }
                
                let test_node = self.build_expr(&if_stmt.test, Some(if_node));
                self.add_edge(if_node, test_node, EdgeType::DataFlow(2.0));
                
                self.build_stmt(&if_stmt.cons, Some(if_node));
                
                if let Some(alt) = &if_stmt.alt {
                    self.build_stmt(alt, Some(if_node));
                }
                
                Some(if_node)
            }
            _ => None,
        }
    }
    
    fn build_block_stmt(&mut self, block: &BlockStmt, parent: Option<NodeIndex>) {
        let block_node = self.add_node(NodeType::Block);
        
        if let Some(p) = parent {
            self.add_edge(p, block_node, EdgeType::AstParent(1.0));
        }
        
        for stmt in &block.stmts {
            self.build_stmt(stmt, Some(block_node));
        }
    }
    
    fn build_expr(&mut self, expr: &Expr, parent: Option<NodeIndex>) -> NodeIndex {
        match expr {
            Expr::Ident(ident) => {
                let name = ident.sym.to_string();
                let ident_node = self.add_node(NodeType::Identifier(name.clone()));
                
                if let Some(p) = parent {
                    self.add_edge(p, ident_node, EdgeType::AstParent(1.0));
                }
                
                // Add data flow edge from definition
                if let Some(&def_node) = self.def_map.get(&name) {
                    self.add_edge(def_node, ident_node, EdgeType::DataFlow(2.0));
                }
                
                ident_node
            }
            Expr::Bin(bin) => {
                let bin_node = self.add_node(NodeType::Binary(bin.op));
                
                if let Some(p) = parent {
                    self.add_edge(p, bin_node, EdgeType::AstParent(1.0));
                }
                
                let left = self.build_expr(&bin.left, Some(bin_node));
                let right = self.build_expr(&bin.right, Some(bin_node));
                
                self.add_edge(bin_node, left, EdgeType::AstParent(1.0));
                self.add_edge(bin_node, right, EdgeType::AstParent(1.0));
                
                bin_node
            }
            Expr::Unary(unary) => {
                let unary_node = self.add_node(NodeType::Unary(unary.op));
                
                if let Some(p) = parent {
                    self.add_edge(p, unary_node, EdgeType::AstParent(1.0));
                }
                
                let arg = self.build_expr(&unary.arg, Some(unary_node));
                self.add_edge(unary_node, arg, EdgeType::AstParent(1.0));
                
                unary_node
            }
            Expr::Call(call) => {
                let callee_name = match &call.callee {
                    Callee::Expr(box Expr::Ident(ident)) => ident.sym.to_string(),
                    _ => "anonymous".to_string(),
                };
                
                let call_node = self.add_node(NodeType::Call(callee_name.clone()));
                
                if let Some(p) = parent {
                    self.add_edge(p, call_node, EdgeType::AstParent(1.0));
                }
                
                // Add call edge to function definition
                if let Some(&def_node) = self.def_map.get(&callee_name) {
                    self.add_edge(call_node, def_node, EdgeType::CallEdge(1.5));
                }
                
                // Build arguments
                for arg in &call.args {
                    let arg_node = self.build_expr(&arg.expr, Some(call_node));
                    self.add_edge(call_node, arg_node, EdgeType::AstParent(1.0));
                }
                
                call_node
            }
            Expr::Lit(lit) => {
                let lit_type = match lit {
                    Lit::Num(n) => LitType::Num(n.value),
                    Lit::Str(s) => LitType::Str(s.value.to_string()),
                    Lit::Bool(b) => LitType::Bool(b.value),
                    _ => LitType::Str("unknown".to_string()),
                };
                
                let lit_node = self.add_node(NodeType::Literal(lit_type));
                
                if let Some(p) = parent {
                    self.add_edge(p, lit_node, EdgeType::AstParent(1.0));
                }
                
                lit_node
            }
            _ => {
                // Fallback for unhandled expressions
                let node = self.add_node(NodeType::Identifier("unknown".to_string()));
                
                if let Some(p) = parent {
                    self.add_edge(p, node, EdgeType::AstParent(1.0));
                }
                
                node
            }
        }
    }
}