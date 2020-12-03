const express = require('express')
const http = require('http')
const path = require('path')
const socketio = require('socket.io')
const Filter = require('bad-words')
const { generateMessage, generateURL } = require('./utils/messages')
const { addUser, removeUser, getUser, getUsersInRoom } = require('./utils/users')

const app = express()
const server = http.createServer(app)
const io = socketio(server)


const port = process.env.PORT || 3000

// Setting up static files

const publicDirectoryPath = path.join(__dirname,'../public')
app.use(express.static(publicDirectoryPath))





io.on('connection', (socket) => {
    
    socket.on('join', ({ username, room }, callback) =>{
        
        const {error, user} = addUser({ id: socket.id, username, room })
        
        if(error){
            return callback(error)
        }
        

        socket.join(user.room)

        socket.emit('message', generateMessage('Admin', 'Welcome!'))   
        socket.broadcast.to(user.room).emit('message', generateMessage('Admin', `${username} has joined!`))
        io.to(user.room).emit('roomData', {
            room: user.room,
            users: getUsersInRoom(user.room)
        })
        callback()

        // socket.emit, io.emit, socket.broadcast.emit
        // io.to.emit ==> emits event to a specific room , socket.broadcast.to.emit ==> sending to event to everyone execpt itself
    })

    socket.on('sendMessage', (message, callback) => {
        
        const user = getUser(socket.id)
        const filter = new Filter()

        if(filter.isProfane(message)){
            return callback('Profanity is not allowed! :)')
        }

        io.to(user.room).emit('message', generateMessage(user.username, message))
        callback('Delivered!')
    })

    socket.on('sendLocation', ({lat, lon}, callback ) => {
        const user = getUser(socket.id)
        io.to(user.room).emit('locationMessage', generateURL(user.username, `https://www.google.com/maps?q=${lat},${lon}`) )
        callback('Location shared!')
    })

    socket.on('disconnect', () =>{
        const user = removeUser(socket.id)
        if(user){
        io.to(user.room).emit('message', generateMessage('Admin', `${user.username} has left!`))
        io.to(user.room).emit('roomData', {
            room: user.room,
            users: getUsersInRoom(user.room)
        })
  
    }
    })


}) 


server.listen(port, () =>{
    console.log(`Server is up and running on port ${port}!`)
})