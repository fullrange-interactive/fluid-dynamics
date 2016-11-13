package js;

@:native('WebsocketConnection') extern class WebsocketConnection {
  public function new(serverHost:String, serverPort:Int, onOpenCallback:js.WebsocketConnection->Void, onMessageCallback:js.WebsocketConnection->Dynamic->Void);

  public function sendMessage(message:Dynamic):Void;
}