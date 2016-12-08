;(function(){

    var client = {
        host : 'ws://10.14.210.79',
        port : 3300,
        isFire : false, //是否可以点击出招
        roomid : null,  //房间号
        userid : null,  //用户编码
        signals : "",   //是"x" or "o"
        board : [0,0,0,0,0,0,0,0],      //井字棋下标  
        status : 0,     // 本家赢的状态
        // 告诉服务器，注册房间
        registerRoom : function(rid){
            this.socket.emit("registerRoom",{
                room_id : rid
            });
        },
        //告诉服务器，客户进入房间
        enterRoom : function(rid,nick){
            this.socket.emit("enterRoom",{
                room_id : rid,
                nick : nick
            });

            // 用户进入socket分组
            this.socket.emit(rid);
        },
        //储存当前用户编码与房间号
        saveId : function(){
            var _this = this;
            _this.socket.on("enterRoom",function(data){
                _this.roomid = data.rid;
                _this.userid = data.uid;
            })
        },
        // 告诉当前用户，有客户进入同一个房间
        onEnterRoom : function(){
            var _this = this;

            _this.socket.on("sayHello",function(data){
                _this.updateName($(".player_rival"),"对手",data.data,"o");
                $(".gametip").html("请出招！");
                $(".box").hide();
                $(".game").show();
                _this.isFire = true;
            })
        },
        //玩家榜
        /* ele:dom节点，str:“我” or “对手”，nick:昵称，sinal:"x" or "o" */
        updateName : function(ele,str,nick,signal){
            var _html = str + "(" + nick + "): " + "<span class='" + signal + "'>" + signal + "</span>";
            ele.html(_html);
        },
        //获取首发家昵称
        getNick : function(){
            var _this = this;
            _this.socket.on("sendNick",function(data){
                _this.updateName($(".player_rival"),"对手",data.nick,"x");
                $(".gametip").html("等待对手出招...");
            })
        },
        //开始游戏
        /* rid:房间号，uid:用户编号，sigal:游戏标志，idx:盒子下标 */
        startGame : function(rid,uid,signal,idx){
            this.socket.emit("startGame",{
                rid : rid,
                uid : uid,
                status : signal,
                idx : idx
            })
        },
        // 添加标记
        addSigal : function(ele,signal){
            var _html = "<div class='" + signal + "'></div>";
            ele.html(_html);
            this.isFire = false;
            $(".gametip").html("等待对方开战...");
        },
        // 检查游戏是否结束,返回1本家赢，返回－1对方赢，返回0平手，2可继续游戏
        checkover : function(){
            var _borad = this.board;
            //井字棋获胜的条件
            var winCondition = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
            for(var i = winCondition.length - 1;i >= 0;i--){
                if(_borad[winCondition[i][0]] + _borad[winCondition[i][1]] + _borad[winCondition[i][2]] == this.status){
                    return 1;
                }
                if(_borad[winCondition[i][0]] + _borad[winCondition[i][1]] + _borad[winCondition[i][2]] == -this.status){
                    return -1;
                }
            }
            var count = 0;
            for(var i = 0 ; i < _borad.length ; i++){
                if(_borad[i] != 0){
                    count++;
                }
            }
            if(count == 8){
                return 0;
            }
            return 2;
        },
        //修改九宫格状态
        changeBoard : function(signal,idx){
            //“o”为－1，“x”为1
            signal = signal == "o" ? -1 : 1;
            this.status = 3*signal;
            this.board[idx] = signal;
        },
        //判断赢点
        isWin : function(sig){
            switch(sig){
                case 0 : 
                    this.delateEvent("打平了哟！",500);
                    break;
                case 1 : 
                    this.delateEvent("恭喜战士获胜！",500);
                    break;
                case -1 : 
                    this.delateEvent("战士输了，再接再厉！",500);
                    break;
                default :
                    return false;
            }
        },
        // 延迟弹出
        delateEvent : function(str,times){
            setTimeout(function(){
                alert(str);
            },times)
        },
        //接收信号
        getSignal : function(){
            var _this = this;
            _this.socket.on("startGame",function(obj){
                var rivalStatus = -(_this.status/3);
                var blocks = $(".block");
                var rivalSigals = _this.signals == "x" ? "o" : "x";

                _this.changeBoard(rivalStatus,obj.idx);
                _this.addSigal($(blocks[obj.idx]),rivalSigals);

                switch(obj.status){
                    case 0 :
                        _this.delateEvent("哎呀，打平了哟",500);
                        break;
                    case 1 : 
                        _this.delateEvent("战士输了，再接再厉！",500); 
                        break;
                    case -1 : 
                        _this.delateEvent("恭喜战士获胜！",500);
                        break;
                    default :                    
                        _this.isFire = true;
                        $(".gametip").html("请出招！");
                        break;
                }
            })
        },
        //接收restart
        gerRestart : function(){
            var _this = this;
            var blocks = $(".block");

            _this.socket.on("restart",function(data){
                var r = confirm("对方请求重新开始游戏，同意不？");
                if(r == true){
                    for(var i = 0 ; i < blocks.length ; i++){
                        $(blocks[i]).html("");
                    }
                }else{
                    return false;
                }
                _this.socket.emit("dealRestart",{
                    r : r,
                    rid : _this.roomid
                })
            })
        },
        dealRestart : function(){
            var _this = this;
            var blocks = $(".block");
            _this.socket.on("dealRestart",function(data){
                console.log(data);
                if(data.r == true){
                    for(var i = 0 ; i < blocks.length ; i++){
                        $(blocks[i]).html("");
                    }
                }
            })
        },
        init : function(){
            // 实例化socket
            this.socket = io.connect(this.host + ":" + this.port);
            //井字棋盒子
            var blocks = $(".block");

            var _this = this;
            //点击进入游戏
            $("#enter").on('click',function(e){
                e.preventDefault();
                $(".mask").hide();
                var rid = $("#room_id").val();
                var nick = $(".input-name").val() == "" ? "匿名" :  $(".input-name").val();

                if(location.hash == ""){
                    //告诉服务器，创建房间
                    _this.registerRoom(rid);
                    // 告诉当前用户，有用户进入同一个房间
                    _this.onEnterRoom();
                    //除去游戏界面
                    $(".game").hide();
                    //更新玩家榜
                    _this.updateName($(".player_me"),"我",nick,"x");
                    //
                    _this.signals = "x";
                }else{
                    //更新房间号
                    rid = location.hash.substr("1");     
                    //除去二维码
                    $(".box").hide();
                    //更新我的玩家榜
                    _this.updateName($(".player_me"),"我",nick,"o");
                    //获取首发家昵称并更新玩家榜
                    _this.getNick();
                    _this.signals = "o";
                 }
                //告诉服务器，客户进入房间
                _this.enterRoom(rid,nick);
                //储存当前用户编码与房间号
                _this.saveId(); 
            });

            //开始游戏
            blocks.on('click',function(e){
                var $this = $(this);
                console.log(_this.isFire);
                //判断能够开战
                if(_this.isFire){
                    if($this.html().length > 0){
                        return;
                    }else{
                        var idx = blocks.index($this);
                        // 添加标志
                        console.log(idx);
                        _this.addSigal($this,_this.signals);
                        _this.changeBoard(_this.signals,idx);

                        var over = _this.checkover();
                        _this.isWin(over);
                        //开始游戏
                        _this.startGame(_this.roomid,_this.userid,over,idx);
                    }
                }else{
                    return;
                }
            });
            // 接收信号
            _this.getSignal();
            //restart
            $(".restart").on("click",function(e){
                e.preventDefault();
                _this.socket.emit("restart",{
                    rid : _this.roomid
                })
            });
            _this.gerRestart();
            _this.dealRestart();
        }
    };
    client.init();
})();