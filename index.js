var express = require('express');
var hbs = require('hbs');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var qrCode = require('qrcode-npm');
var uuid = require('node-uuid');

//房间模块
var room = require("./lib/room.js");

//静态资源目录
app.use(express.static('public'));
//设置模版引擎的后缀名
app.set('view engine','html');
//运行hbs木块
app.engine('html',hbs.__express);

app.get('/client',function(req,res){
    // 定义协议与请求的url
    var http = 'http://';
    var host = req.headers.host;

    // 生成唯一的房间号
    var rid = createKey();

    //生成对应的二维码
    var qr = qrCode.qrcode(8,'M');
    qr.addData(http + host + '/client/#' + rid);
    qr.make();

    res.render('client',{
        data : qr.createImgTag(8),
        room_id : rid
    });
})

app.get('/game*',function(req,res){
    res.render('game');
})

//生成唯一的id
function createKey(){
    return uuid.v4().substr(0,6);
}

//在线房间号
var onlineRooms = {};

io.on('connection',function(socket){
    //创建房间
    socket.on('registerRoom',function(obj){
        //建立的房间存入socket
        socket.name = obj.room_id;
        //检查是否已经有该房间
        if(!onlineRooms.hasOwnProperty(obj.room_id)){
            //如果该房间不存在则创建该房间
            var r = room.createRoom({
                RoomID : obj.room_id
            });
            onlineRooms[obj.room_id] = r;

        }else{
            console.log(obj.room_id + ' existed');
        }
    });
    // 用户进入房间
    socket.on('enterRoom',function(obj){
        //房间号
        var rid = obj.room_id;
        //找到对应的房间
        var r = onlineRooms[rid];
        if(r.Users.length >= r.Max){
            console.log('Room ' + rid + ' is full');
            return ;
        }else{
            var index = r.Users.length + 1;
            //用户对象
            var u = {
                Name : rid + index,
                Nick : obj.nick
            };
            // 将用户存入socket
            socket.name = rid + index;
            //用户进入房间
            r.Users.push(u);
            console.log("onlineRooms:",onlineRooms);
            
            // 给socket进行分组
            socket.on(obj.room_id,function(){
                console.log(obj.room_id);
                socket.join(obj.room_id);
            })
            if(r.Users.length == r.Max){
                //告诉首发，有新玩家进入
                socket.broadcast.to(obj.room_id).emit('sayHello', {data : obj.nick});
                //告诉新玩家，首发家的昵称
                var firstUser = r.Users[0].Nick;
                socket.emit("sendNick",{
                    nick : firstUser
                });
            }
            
            // 返回连接的用户的uid，用于后面的通信
            socket.emit("enterRoom",{
                rid : rid,
                uid : u.Name
            });
        }
        //restart
        socket.on("restart",function(obj){
            socket.broadcast.to(obj.rid).emit('restart', {data : obj.rid});
        })
        //dealrestart
        socket.on("dealRestart",function(obj){
            socket.broadcast.to(obj.rid).emit("dealRestart",{
                r : obj.r
            })
        })
    });
    //接受信号
    socket.on('startGame',function(obj){
        //发送信号
        socket.broadcast.to(obj.rid).emit('startGame', {
            status : obj.status,
            idx : obj.idx
        });
    })
});


// 启动服务器
http.listen(3300,function(){
    console.log('listening on : localhost:3300');
})