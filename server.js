'use strict';

const Hapi = require('Hapi');
const mongoose = require('mongoose');

mongoose.connect('mongodb://localhost/test');

let db = mongoose.connection;

db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', function() {
    // we're connected
    console.log(`connected to the Matrix`);
    console.log(`Hello Neo`);
});

// Define the schema
let taskSchema = mongoose.Schema({
    task: String,
    owner: String,
    index: Number
});

// Compile our schema into a model
let Task = mongoose.model('Task', taskSchema);

// create a server with a host and port
const server = new Hapi.Server();
server.connection({
    host: 'localhost',
    port: 8000
});

// Add the route
server.route([
    {
        method: 'GET',
        path: '/',
        handler: function(request, reply) {
            return reply('hello world from Hapi');
        }
    },
    {
        method: 'GET',
        path: '/api/v1/todolist',
        handler: function(request, reply) {
            let result = Task.find().sort({'index': -1}).limit(10);
            result.exec(function(err, tasks) {
                reply(tasks);
            });
        }
    },
    {
        method: 'POST',
        path: '/api/v1/todolist',
        handler: function(request, reply) {
            let latest_tasks = Task.find().sort({'index': -1}).limit(1);
            latest_tasks.exec(function(err, task) {
                let new_index = task[0]["index"] + 1;
                let newTask = new Task({
                    'task': request.payload.task,
                    'owner': request.payload.owner,
                    'index': new_index
                }); 

                newTask.save(function(err, newTask) {
                    reply(newTask).code(201);
                });
            });
        }
    },
    {
        method: 'GET',
        path: '/api/v1/todolist/{index}',
        handler: function(request, reply) {
            let result = Task.findOne({"index": request.params.index});
            result.exec(function(err, task) {
                if (task) {
                    reply(task);
                } else {
                    reply().code(404);
                }
            });
        }
    },
    {
        method: 'PUT',
        path: '/api/v1/todolist/{index}',
        handler: function(request, reply) {
            let updateData = {
                'task': request.payload.task,
                'owner': request.payload.owner,
                'index': request.params.index
            };

            Task.findOneAndUpdate(
                {'index': request.params.index},
                updateData,
                {new: true},
                function(err, doc) {
                    reply(doc);
                }
            );
        }
    },
    {
        method: 'DELETE',
        path: '/api/v1/todolist/{index}',
        handler: function(request, reply) {
            Task.findOneAndRemove({index: request.params.index}, function(err, response) {
                reply().code(204);
            });
        }
    }
]);

// start the server
server.start((err) => {
    if(err) {
        throw err;
    }

    console.log('Server running at: ', server.info.uri);
});