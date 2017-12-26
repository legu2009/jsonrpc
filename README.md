# jsonrpc

JSON-RPC 是一个无状态的轻量的远程调用协议.  [http://www.jsonrpc.org/specification](http://www.jsonrpc.org/specification).

jsonrpc.js 实现了 JSON-RPC 协议，没有实现消息传递的过程。实际使用的时候需要自己根据消息传递的方式扩展，也是该js应用的场景更广泛，不局限于底层消息传递方式。

## 环境

jsonrpc.js 只要是能够运行js的环境都可以。

## 不支持批量消息

处理批量消息的情况，有些是同步的，有些是异步的可能需要等待很长的时间，如果等所以批量的消息都有返回结构了，才发送结果消息，感觉存在的浪费

## API    

[jsonRpc.addCommand(name，func，opt)]() Function

注册可以被远程端调用的方法

#### Arguments
- [name(String)](): 方法的名字
- [func(Function)](): 对应的方法
- [opt(Object)](): 
    {
        sync: false，//默认情况，函数返回不是Promise且为undefind时不调用回调
        always: false，//默认情况，函数回调一次就不在调用回调，设置true可以一直回调，但是需要使用
    }


[jsonRpc.removeCommand(name)]() Function

移除远程端调用的方法

#### Arguments
- [name(String)](): 方法的名字


[jsonRpc.exec([extend]，name，[params]，[func])]() Function

发起远程调用，调用远端name的方法，参数为params（JSON-RPC，协议，支持Arrary和Object），获得返回的运行结果的时候，运行对应的func方法

#### Arguments
- [extend](): 
    {
        always: true，//函数回调不会清除引用，用于响应多child消息回调
        ...otherProps: //Object.assign 扩展obj
    }
- [name(String)](): 远端方法的名字
- [params(Arrary or Object)](): 运行远端方法时候的参数(形式同JSON-RPC协议 的 params）
- [func(Function(reresult messages))](): 返回的运行结果的时候，运行对应的方法，没有该参数，为通知方式发送消息

[jsonRpc._send](obj，mess) Function 

需要扩展，实现底层消息传递

#### Arguments
- [obj(Object)](): 需要发送到远端的消息对象
- [mess(Object)](): mess是undefined时，本地可以理解为客户端，运行了jsonRpc.exec方法; mess存在的时候，本地可以理解为服务端，运行了对应的方法，mess为请求的数据


[jsonRpc._onMessage](str) Function

当有消息接收的时候主动调用，通过jsonRpc处理逻辑


[jsonRpc.onCall(mess)]() Function  

本地可以理解为服务端，注册的方法执行前调用，返回false不执行方法

[jsonRpc.onResult(mess)]() Function  

本地可以理解为客户端，接收到返回消息，执行回调之前

## EXAMPLE

没有实际项目应用，只是觉得需要支持

#### test.html
基本消息传递的例子

#### sync.html
同步函数情况下，对返回值undefind的处理

#### send.html
通过_call，从消息体本身的设计，限制服务端执行逻辑

#### result.html
通过_guid，从消息体本身的设计，限制客户端对回调的执行

#### always1.html
应对服务器端消息 分多次返回

#### always2.html
应对客户端发送多个服务器端消息，都进行响应