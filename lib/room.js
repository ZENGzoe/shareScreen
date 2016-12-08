function Room(param){
    var defaults = {
        //房间最大认输
        count : 2
    };
    //房间id
    this.RoomID = param.RoomID || '';
    //房间成员
    this.Users = [];
    //房间最大成员数
    this.Max = defaults.count;
}
exports.createRoom = function(param){
    return new Room(param);
}