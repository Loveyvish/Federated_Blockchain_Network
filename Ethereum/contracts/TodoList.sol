pragma solidity ^0.5.0;

contract TodoList
{
    uint public taskCount = 0;
    struct Task {
        uint id;
        string content;
        bool completed;
    }

    mapping(uint=>Task) public  tasks;

    event TaskCreated(
        uint id,
        string content,
        bool completed
    );
    
    event ValueChanged(uint256 newValue);
    uint256 public value;

    constructor() public{
        createTask("Default task");
        createTask("Task 1");
    }

    function createTask(string memory _content) public{
        taskCount++;
        tasks[taskCount] = Task(taskCount,_content,false);
        emit TaskCreated((taskCount), _content, false); 
    }

    function getTaskCount() public view returns(uint count){
        return taskCount;
    }

    function setValue(uint256 _value) public {
        value = _value;
        emit ValueChanged(_value);
    }

}