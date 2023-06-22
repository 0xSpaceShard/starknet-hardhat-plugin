// an invalid contract by virtue of invalid spaces in the mod name

#[contract]
mod First       Contract {
    #[view]
    fn greet() -> felt252 {
        return 'Hello from First';
    }
}

#[contract]
mod AnotherContract {
    #[view]
    fn get_balance() -> felt252 {
        return 'Hello from Another';
    }
}
