use serde_json::json;
use std::io::{self, Read};

#[no_mangle]
pub extern "C" fn _start() {
    // read stdin (optional inputs)
    let mut buf = String::new();
    io::stdin().read_to_string(&mut buf).ok();

    // set and then get a note
    println!("{}", json!({
        "type": "syscall.kv.set",
        "key": "note/last",
        "value": { "msg": "hello from wasm" }
    }).to_string());

    println!("{}", json!({
        "type": "syscall.kv.get",
        "key": "note/last"
    }).to_string());
}
