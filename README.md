# nav-support

* Introduction
	* nav-support库对导航框架中nav API及message API等底层接口做了封装，提供了在常见场景下更加方便的导航接口，使用时无需关注底层事件机制及消息机制等细节。同时nav-support库提供了更多的调试诊断信息，帮助开发时更早地发现导航中错误使用接口带来的潜在问题。
	* 适用场景：a页面跳转到b页面，a传递参数给b，触发b中某个函数，b返回a时，将处理的结果带回给a


* Getting started
	* 引用最新版本的dingtalk.js（dingtalk.js地址请查阅开放平台文档）
	* 引用lib/support.js
	* 对support.js中api的使用，需要在dd.ready()回调触发之后，否则可能调用无效
	* 须在dd.config传入的参数jsApiList中加上 ui.nav.preload, ui.nav.go, biz.util.openLink
	* 使用nav-support库时请不要同时使用message API（runtime.message.post及runtime.message.fetch），否则在边际情况下可能造成消息丢失。
	
	```
<!DOCTYPE html>
<html>
<head>
	<!-- 此处dingtalk.js版本（0.6.6）需要更新至最新版本 -->
    <script type="text/javascript" src="http://g.alicdn.com/ilw/ding/0.6.6/scripts/dingtalk.js"></script>
	<script type="text/javascript" src="lib/javascripts/support.js"></script>
	<script type="text/javascript">
	dd.config({
	    agentId: _config.agentId,
            corpId: _config.corpId,
            timeStamp: _config.timeStamp,
            nonceStr: _config.nonceStr,
            signature: _config.signature,
            jsApiList: ['ui.nav.preload','ui.nav.go', 'biz.util.openLink']
	});
	dd.ready(function() {
	    dd.support.nav.init({
	        id: 'myid' //首页id必须初始化为home_page
                onInvoke: function(data) {
                    alert('onInvoke: ' + JSON.stringify(data));
                },
                onError: function(err) {
                    alert('onError: ' + JSON.stringify(err));
                }
            });
	});
    </script>
</head>
<body></body>
</html>

	```
	
* API
	* dd.support
		* nav-support接口均出于dd.support名字空间之下
	* dd.support.logger
		* nav-support调试信息日志管理器，用于开发时提示错误信息
	* dd.support.logger.level
		* logger级别，取值包括：logger.LEVEL.INFO，logger.LEVEL.WARNING(初始状态默认值)。
		* 当logger.level为logger.LEVEL.INFO时，所有调试信息及错误信息由console.log输出
		* 当logger.level为logger.LEVEL.WARNING时，错误信息由alert输出，调试信息由console.log输出
		* 可以通过重写dd.support.logger.i，覆盖logger输出调试信息的行为
		* 可以通过重写dd.support.logger.w，覆盖logger输出错误信息的行为
	* dd.support.nav.init
		* 初始化nav-support库，每个使用support库的页面都需要在最开始处调用此方法。
		* 首页id必须初始化为home_page
		* 参数形式为
		
		```
		dd.support.nav.init({
			id: 'myid', //当前frame的id。某个frame通过init初始化的id，必须和该frame被preload时所设入的id一致
			onError: function(err){
				//必须。nav-support库全局错误处理器，参数err为错误对象
			},
			onInvoke: function(data) {
				//必须。nav调用处理器。当由其他frame调起本frame时，触发该函数。
				//参数data数据类型取决于调用者frame传递过来的数据
			}
		});
		
		```
	* dd.support.nav.preload
		* 预加载nav frame
		* 参数形式为
		
		```
		dd.support.nav.preload({
			pages: [ //必须。预加载的frame信息
				{
					id: 'id1', //必须。string类型。预加载的frame id。
					url: 'http://abc.def', //必须。string类型。预加载frame的url
				}，
				...
			],
			onSuccess: function(data) {
				//可选。预加载结果回调，当预加载的frame状态发生变化时触发，可能会触发多次。参数data形如：
				//{
				//	id: 'id1',  
				//	status: 0,
				//	extras: {}
				//} 
				//其中id为string类型，表示触发状态改变的frame的id，
				//status为number类型，表示该frame的状态，0表示开始加载，1表示加载完成，-1表示加载错误
				//extras为object类型，表示加载错误时的额外信息
			},
			onFail: function(err) {
				//可选。预加载错误。不提供onFail参数时，默认回调init接口传入的onError全局错误处理函数
			}
		});
		
		```
	* dd.support.nav.go
		* 触发frame跳转。
		* 参数形式为
		
		```
		dd.support.nav.go({
			id: 'id1', //必须。跳转的目标frame的id
			createIfNeeded: true, //可选。默认值为false。当该值为true时表示若目前frame从未预加载过，则在本操作中先做预加载再跳转
			url: 'http://abc.def', //可选。当createIfNeeded为true时有效，表示要跳转的目标frame的url
			params: {}, //可选。object类型，传递给目标frame的参数
			handler: 'fn', //可选。string类型，目标frame中被触发的函数名。作为handler的函数形如function fn(data, callback){}, 具体说明见下面例子
			onSuccess: function(data) {
				//可选。当从目标frame返回当前frame时，触发该函数，传入参数即是从目标frame返回的结果
			},
			onFail: function(err) {
				//可选。
			}
		});
		
		```
		
		* sample
		
		```
		/**
		 * a.html
		 * a页面预加载了b页面，并在b页面开始加载时跳转过去
		 */
		 dd.support.nav.preload({
		 	pages: [
		 		{
		 			id: 'b',
		 			url: 'b.html',
		 		}
		 	],
		 	onSuccess: function(data) {
		 		//判断回调data中的id是否为b.html的id，其状态是否为开始加载
		 		if (data && data.id === 'b' && data.status === 0) {
		 			dd.support.nav.go({
		 				id: 'b',
		 				params: {x: 123, y: 'abc', z: {}},
		 				handler: foo, //b.html中被触发的函数
		 				onSuccess: function(data) {
		 					alert(JSON.stringify(data)); //处理从b.html返回时带回来的结果
		 				}
		 			});
		 		}
		 	}
		 });
		
		```
		
		```
		/**
		 * b.html
		 * b页面接收a页面传递过来的参数，处理完将结果返回
		 */
		 
		 // handler函数必须接受两个参数。data为a.html传递过来的参数，callback是回调函数，
		 // handler函数通过callback函数将结果返回给a.html
		 function foo(data， callback) {
		 	alert(JSON.stringofy(data));
		 	data.x += 1;
		 	data.y = 'def;
		 	data.z.attr = 'value';
		 	callback(data); //页面返回前必须调用callback
		 }
		
		```
		
		```
		/**
		 * a.html
		 * 这个例子演示了如果在没有预加载的情况下，如果从a.html直接跳转到b.html
		 * 只需要增加两个参数：参数createIfNeeded为true，参数url值为b页面的url
		 */
		 
		 dd.support.nav.go({
		 	id: 'b',
		 	createIfNeeded: true,
		 	url: '2.html',
		 	params: {x: 123, y: 'abc', z: {}},
		 	handler: foo, //b.html中被触发的函数
		 	onSuccess: function(data) {
		 		alert(JSON.stringify(data)); //处理从b.html返回时带回来的结果
		 	}
		 });
		
		```
	* dd.support.nav.recycle
	* dd.support.nav.close
	* dd.support.nav.getCurrentId
	* dd.support.drawer.init
	* dd.support.drawer.config
	* dd.support.drawer.open
		* 类似于dd.support.nav.go, 参数形如
		
		```
		dd.support.drawer.open({
			params: {}, //可选。传递给drawer的参数
			handler: 'fn', //可选。触发drawer的函数名
			onSuccess: function(res) {}, //可选。接收drawer回传结果的函数
			onFail: function(err) {} //可选。
		});
		
		```
		
	* dd.support.drawer.close
	* dd.support.drawer.enable
	* dd.support.drawer.disable
	* dd.support.call
		* 调用某个frame的函数，一般可用于drawer向主frame函数发起调用。参数形如
		
		```
		
		dd.support.call({
			id: 'id1', //必须。目标frame的id
			params: {}, //可选。传递给目标frame的参数
			handler: 'fn', //可选。触发目标frame的函数名
			onSuccess: function(res) {}, //可选。接收目标frame回传结果的函数
			onFail: function(err) {} //可选。
		});
		
		```
