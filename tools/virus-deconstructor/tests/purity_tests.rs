use virus_deconstructor::purity::{PurityChecker, PureFunction};

#[test]
fn test_pure_math_functions() {
    let code = r#"
        function add(a, b) {
            return a + b;
        }
        
        function multiply(x, y) {
            return x * y;
        }
        
        const square = (n) => n * n;
        
        function factorial(n) {
            if (n <= 1) return 1;
            return n * factorial(n - 1);
        }
    "#;
    
    let functions = extract_functions(code);
    assert_eq!(functions.len(), 4);
    assert!(functions.iter().all(|f| f.is_pure));
}

#[test]
fn test_impure_console_functions() {
    let code = r#"
        function debugAdd(a, b) {
            console.log('Adding', a, b);
            return a + b;
        }
        
        function alertResult(msg) {
            alert(msg);
        }
    "#;
    
    let functions = extract_functions(code);
    assert_eq!(functions.len(), 0); // All should be filtered as impure
}

#[test]
fn test_impure_global_access() {
    let code = r#"
        let globalCounter = 0;
        
        function incrementCounter() {
            globalCounter++;
            return globalCounter;
        }
        
        function getTime() {
            return Date.now();
        }
        
        function getRandom() {
            return Math.random();
        }
    "#;
    
    let functions = extract_functions(code);
    assert_eq!(functions.len(), 0); // All access external state
}

#[test]
fn test_async_functions_impure() {
    let code = r#"
        async function fetchData(url) {
            const response = await fetch(url);
            return response.json();
        }
        
        function delay(ms) {
            return new Promise(resolve => setTimeout(resolve, ms));
        }
    "#;
    
    let functions = extract_functions(code);
    assert_eq!(functions.len(), 0); // Async operations are impure
}

#[test]
fn test_pure_array_operations() {
    let code = r#"
        function sum(arr) {
            return arr.reduce((a, b) => a + b, 0);
        }
        
        function map(arr, fn) {
            return arr.map(fn);
        }
        
        function filter(arr, predicate) {
            return arr.filter(predicate);
        }
    "#;
    
    let functions = extract_functions(code);
    assert_eq!(functions.len(), 3);
    assert!(functions.iter().all(|f| f.is_pure));
}

// Helper function
fn extract_functions(code: &str) -> Vec<PureFunction> {
    use swc_common::sync::Lrc;
    use swc_common::SourceMap;
    use swc_ecma_parser::{lexer::Lexer, Parser, StringInput, Syntax};
    
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
    let module = parser.parse_module().unwrap();
    
    let mut checker = PurityChecker::new();
    checker.extract_pure_functions(&module)
}