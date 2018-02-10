pragma solidity ^0.4.19;

import "ds-math/math.sol";
import "./ERC20Interface.sol";

/// @title Premined asset Contract for testing
/// @notice ONLY for testing
contract PreminedAsset is DSMath, ERC20Interface {

    mapping (address => uint) balances;
    mapping (address => mapping (address => uint)) allowed;
    uint public totalSupply;

    /// @notice Asset with 10 ** 28 of premined token given to msg.sender
    function PreminedAsset() {
        // Premine balances of contract creator and totalSupply
        balances[msg.sender] = 10 ** uint256(28);
        totalSupply = 10 ** uint256(28);
    }

    function totalSupply() constant returns (uint256 totalSupply) {
        return totalSupply;
    }

    function balanceOf(address _owner) constant returns (uint256 balance) {
        return balances[_owner];
    }

    function allowance(address _owner, address _spender) constant returns (uint256 remaining) {
        return allowed[_owner][_spender];
    }

    function transfer(address _to, uint256 _value) returns (bool success) {
        require(balances[msg.sender] >= _value && add(balances[_to], _value) > balances[_to]);
        balances[msg.sender] = sub(balances[msg.sender], _value);
        balances[_to] = add(balances[_to], _value);
        Transfer(msg.sender, _to, _value);
        return true;
    }

    function transferFrom(address _from, address _to, uint256 _value) returns (bool success) {
        require(balances[_from] >= _value && allowed[_from][msg.sender] >= _value && add(balances[_to], _value) > balances[_to]);
        balances[_to] = add(balances[_to], _value);
        balances[_from] = sub(balances[_from], _value);
        allowed[_from][msg.sender] = sub(allowed[_from][msg.sender], _value);
        Transfer(_from, _to, _value);
        return true;
    }

    function approve(address _spender, uint256 _value) returns (bool success) {
        allowed[msg.sender][_spender] = _value;
        Approval(msg.sender, _spender, _value);
        return true;
    }
}
