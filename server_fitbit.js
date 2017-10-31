'use strict';

const Hapi = require('hapi');
const Fitbit = require('fitbit-node');
const mongoose = require('mongoose');

const clientID = '22CJTP';
const clientSecret = '6ad43819c397953e20c03548b8811eec';
const redirect_uri = 'http://localhost:8000/fitbit_oauth_callback';

mongoose.connect('mongodb://localhost/test');

const db = mongoose.connection;

db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', function() {
    // we're connected
    console.log(`connected to the Matrix`);
    console.log(`Hello Neo`);
});

let userSchema = mongoose.Schema({
    userid: String,
    accessToken: String,
    refreshToken: String
});

let User = mongoose.model('User', userSchema);

let client = new Fitbit(clientID, clientSecret);
let scope = "activity profile";


// Create a server with a host and port
const server = new Hapi.Server();

server.connection({
    host: 'localhost',
    port: 8000
});

// Add the route
server.route([
    {
        method: 'GET',
        path:'/',
        handler: function(request, reply) {

            return reply('Welcome to the VORTEX');
        }
    },
    {
        method: 'GET',
        path:'/fitbit',
        handler: function(request, reply) {
            reply().redirect(client.getAuthorizeUrl(scope, redirect_uri));
        }
    },
    {
        method: 'GET',
        path:'/api/v1/users/{fitbitid}',
        handler: function(request, reply) {
            let result = User.findOne({"userid": request.params.fitbitid});
            result.exec(function(err, user) {
                client.get("/profile.json", user.accessToken)
                    .then((profile) => {
                        reply(profile);
                    });
            });
        }
    },
    {
        method: 'GET',
        path:'/fitbit_oauth_callback',
        handler: function(request, reply) {
            client.getAccessToken(request.query.code, redirect_uri)
                .then((result) => {
                    updateUser(result.user_id, result.access_token, result.refresh_token);
                    reply().redirect("/api/v1/users/" + result.user_id);   
                })
        }
    }
]);

function updateUser(userid, accessToken, refreshToken) {
    let newUserInfo = {
        "userid": userid,
        "accessToken": accessToken,
        "refreshToken": refreshToken
    };

    let newUSer = new User(newUserInfo);
    User.update({"userid": userid}, newUSer, {upsert: true}, function(err) {
        return;
    });
}

// Start the server
server.start((err) => {

    if (err) {
        throw err;
    }
    console.log(`Server running at:`, server.info.uri);
});