'use strict';

const AWS = require('aws-sdk');
const db = new AWS.DynamoDB.DocumentClient({ apiVersion: '2012-08-10' });
const { v4: uuid } = require('uuid');

const todosTable = process.env.TODOS_TABLE;

// Create a response
function response(statusCode, message) {
  return {
    statusCode: statusCode,
    body: JSON.stringify(message)
  };
}

function sortByDate(a, b) {
  if (a.createdAt > b.createdAt) {
    return -1;
  } else return 1;
}

module.exports.createTodo = (event, context, callback) => {
  const reqBody = JSON.parse(event.body);

  if (
    !reqBody.title ||
    reqBody.title.trim() === '' ||
    typeof reqBody.completed !== "boolean"
  ) {
    return callback(
      null,
      response(400, {
        error: 'Todo must have a non empty title and completed boolean'
      })
    );
  }

  const todo = {
    id: uuid(),
    createdAt: new Date().toISOString(),
    userId: 1,
    title: reqBody.title,
    completed: reqBody.completed
  };

  return db
    .put({
      TableName: todosTable,
      Item: todo
    })
    .promise()
    .then(() => {
      callback(null, response(201, todo));
    })
    .catch((err) => response(null, response(err.statusCode, err)));
};

module.exports.getAllTodos = (event, context, callback) => {
  return db
    .scan({
      TableName: todosTable
    })
    .promise()
    .then((res) => {
      callback(null, response(200, res.Items.sort(sortByDate)));
    })
    .catch((err) => callback(null, response(err.statusCode, err)));
};

module.exports.getTodos = (event, context, callback) => {
  const numberOfTodos = event.pathParameters.number;
  const params = {
    TableName: todosTable,
    Limit: numberOfTodos
  };
  return db
    .scan(params)
    .promise()
    .then((res) => {
      callback(null, response(200, res.Items.sort(sortByDate)));
    })
    .catch((err) => callback(null, response(err.statusCode, err)));
};

module.exports.getTodo = (event, context, callback) => {
  const id = event.pathParameters.id;

  const params = {
    Key: {
      id: id
    },
    TableName: todosTable
  };

  return db
    .get(params)
    .promise()
    .then((res) => {
      if (res.Item) callback(null, response(200, res.Item));
      else callback(null, response(404, { error: 'Todo not found' }));
    })
    .catch((err) => callback(null, response(err.statusCode, err)));
};

module.exports.updateTodo = (event, context, callback) => {
  const id = event.pathParameters.id;
  const reqBody = JSON.parse(event.body);
  const { title, completed } = reqBody;

  const params = {
    Key: {
      id: id
    },
    TableName: todosTable,
    ConditionExpression: 'attribute_exists(id)',
    UpdateExpression: 'SET title = :title, completed = :completed',
    ExpressionAttributeValues: {
      ':title': title,
      ':completed': completed
    },
    ReturnValues: 'ALL_NEW'
  };
  console.log('Updating');

  return db
    .update(params)
    .promise()
    .then((res) => {
      console.log(res);
      callback(null, response(200, res.Attributes));
    })
    .catch((err) => callback(null, response(err.statusCode, err)));
};

module.exports.deleteTodo = (event, context, callback) => {
  const id = event.pathParameters.id;
  const params = {
    Key: {
      id: id
    },
    TableName: todosTable
  };
  return db
    .delete(params)
    .promise()
    .then(() =>
      callback(null, response(200, { message: 'Todo deleted successfully' }))
    )
    .catch((err) => callback(null, response(err.statusCode, err)));
};