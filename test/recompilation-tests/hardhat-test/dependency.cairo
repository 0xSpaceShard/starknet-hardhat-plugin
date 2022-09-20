%lang starknet

@view
func almost_equal(a, b) -> (res: felt) {
    if ((a - b) * (a - b - 1) * (a - b + 1) == 0) {
        return (res=1);
    }
    return (res=0);
}
