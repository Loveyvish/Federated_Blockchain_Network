// SPDX-License-Identifier: MIT
pragma solidity >=0.4.22 <0.9.0;

contract DataProcessor {
    struct DataEntry {
        uint256 id;
        string jsonData;
    }

    mapping(uint256 => DataEntry) public dataStore;
    event DataStored(uint256 indexed id, string jsonData);

    uint256[] private allIds;  // Store all used IDs
    uint256 private nextId = 1;  // Auto-increment ID counter

    function storeData(string memory jsonData) public {
        uint256 id = nextId;  // Assign the next available ID
        dataStore[id] = DataEntry(id, jsonData);
        allIds.push(id);  // Track new ID
        nextId++;  // Increment ID counter
        emit DataStored(id, jsonData);
    }

    function getData(uint256 id) public view returns (string memory) {
        return dataStore[id].jsonData;
    }

    function getAllIds() public view returns (uint256[] memory) {
        return allIds;  // Return all stored IDs
    }
}