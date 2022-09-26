// unknown identifier
%lang starknet
%builtins pedersen range_check

from starkware.cairo.common.cairo_builtins import HashBuiltin
from openzeppelin.token.erc721.library import ERC721

@constructor
func constructor{syscall_ptr: felt*, pedersen_ptr: HashBuiltin*, range_check_ptr}(
) {
    ERC721.nonexistent_method();
    return ();
}
