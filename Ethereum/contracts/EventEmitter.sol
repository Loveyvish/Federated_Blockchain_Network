// SPDX-License-Identifier: MIT
pragma solidity ^0.5.0;

contract SimpleStorage {
    event ValueChanged(uint256 newValue);

    uint256 public value;

    function setValue(uint256 _value) public {
        value = _value;
        emit ValueChanged(_value);
    }
}
