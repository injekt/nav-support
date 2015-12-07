## 常见错误

##### 经常弹出'Oops! xxx errors happened at http://abc.xyz [line xx, column yy']'的错误提示弹框
* Q: 这些错误提示辅助开始时更早地发现错误。在正式生产环境中，或其它想关闭错误提示的时候，可通过设置logger的日志级别关闭错误信息弹框
```
dd.support.logger.level = dd.support.logger.LEVEL.INFO;
```

##### 错误提示：'Warning: more than one REQ or RES message are post to this frame: {frame id}'
* 当前frame收到了超过一条的未处理消息。
* 虽然底层message API（dd.runtime.message.post/fetch）支持frame的消息队列中存储多于一条的未处理消息，但对于nav-support库而言，为了简化frame之间的跳转即数据传递，加入了此限制：在通过dd.support.nav.go以及dd.support.call等接口跳转或发送消息调用时，只能有一条消息被发往目标frame。
* 当出现此错误时，请检查是不是在使用dd.support.nav.go进行跳转之前，也使用了dd.support.call对目标frame发送了消息

##### 错误提示：'parameter for preload() is missing'；'pages is missing'；'invalid pages: not an array'
* 调用dd.support.nav.preload时没有传入参数；传入的参数缺少pages字段；传入的参数pages字段非法，不是数组类型

##### 错误提示：'Warning: preload id {frame id} too frequently'
* 调用dd.support.nav.preload重复预加载某个frame id
* 虽然底层nav API (dd.ui.nav.preload) 支持重复preload某个frame id，但对于nav-support库而言，为了简化nav使用，加入了此限制。

##### 错误提示：'calling go() for id {frame id} at http://abc.xyz too frequently'
* 调用dd.support.nav.go发起往frame id的跳转过于频繁。在发起一次go跳转后，若其onSuccess/onFail回调仍未触发便发起第二次go跳转，便会触发此错误。
* 应当避免错误地连续触发多次go跳转

##### 错误提示：'handler is supposed to be a string'
* dd.support.nav.go/dd.support.call传入参数的handler字段，应当是string类型，表示目标frame触发的函数名。

##### 错误提示：'url of go() is missing or invalid'
* 一次dd.support.nav.go调用，其目标frame所加载的url，必须是之前通过preload进行预加载传入，或者调用go时通过参数的url字段传入。此错误说明这两种情况都没有传入url。

##### 错误提示：preload too long: ' + id)
* 预加载frame id时间过长。此错误可忽略，仅供指示预加载时间。

##### 错误提示：'drawer id is undefined. Has drawer been initialized?
* drawer没有正确初始化。请确保drawer通过dd.support.drawer.init初始化，传入参数中必须带有id字段，指示drawer的frame id

##### 错误提示：'thie frame is not initialized with a frame id'
* 当前frame没有通过dd.support.nav.init正确初始化。初始化传入的参数必须带有id字段，指示当前frame的id。
* 当A使用preload预加载B时，需要传入id作为目标frame，即B的frame id；当A直接通过go调用跳转到B，也需要传入id作为B的frame id。这两种情况下，传入的id都需要和B自身通过dd.support.nav.init初始化自己时传入的id一致，否则可能导致B的消息无法接收。

##### 错误提示：'dd.support is already defined'
* 重复引入support.js
