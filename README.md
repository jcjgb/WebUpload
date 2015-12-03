# WebUpload
公司使用的百度插件，多处有改动    -戈志刚

```javascript
//单图片上传，限制只能上传图片
attachPool.add({
    //下面4个带有#的id与上方参数表格中橙色字体的参数意义对应
    containerId: '#uploader',
    listId: '#attachList',
    uploadInitId: '#filePicker',
    uploadInitLabel: '点击选择',
    //限制只能上传一个文件
    fileNumLimit: 1,
    //限制只可以上传图片
    accept: {
        title: '指定格式',
        extensions: 'gif,jpg,jpeg,bmp,png',
        mimeTypes: 'image/*'
    },
    dndArea: '#dndArea',
    falg: true,
    form: {
        businessId: $('#id').val(),
        businessTable: 'toa_im_info',
        category: 'portalPicImg'
    },
    isEcho: true
});
/**
 * 获取当前页面所有已上传附件
 * 若无符合webupload上传文件的变量则返回 null
 * @Examples
 *  var files = attachPool.getFiles();
 *  if(files) formData.push({"name": "fileids", "value": files });
 */
attachPool.getFiles();
/**
 * 查询已上传附件
 * @Examples
 * attachPool.updateUpload({
 *      containerId ： '#uploader',
 *      form : {
 *          businessId: $('#id').val(),
 *          businessTable: 'toa_im_info',
 *          category: 'portal1'         //如果含有多个上传附件，此值就是过滤作用，不填写可查询当前表下所有对应业务id的附件
 *      },
 *      iscopy : 1    //可不填写，默认0
 * },function(files){
 *      alert("查询到的结果集");
 * });
 * 如果callback参数填写,则不再执行插件内置的回显列表方法
 * 插件内部回显列表方法就是点击上传后页面自动添加列表的方法
 */
attachPool.updateUploader(option,callback);
/**
 * 获取upload实例
 * 若无返回 null
 * @Examples
 *  attachPool.add({
 *      containerId: '#uploader',
 *          ready: function() {
 *          var uploader = attachPool.getUploader('#uploader');
 *          if (uploader) {
 *              uploader.options.formData.businessId = businessId;
 *              uploader.options.formData.businessTable = businessTable;
 *          }
 *      }
 * });
 */
attachPool.getUploader(containerId);
/**
 * 文件转换字节
 * @param  {[type]} num [文件字节数]
 * @Examples
 * var size = attachPool.roundSize(233021);
 * onsole.log(size); //227.56 KB
 */
attachPool.formatSize(num);
```
```html
<!-- //附件调用实例 -->
<div class="modal fade panel" id="file-edit" aria-hidden="false">
	<div class="modal-dialog">
		<div class="modal-content">
			<div class="modal-header">
				<button type="button" class="close" id="closebtn" data-dismiss="modal">×</button>
				<h4 class="modal-title">添加上传文件</h4>
			</div>
			<div class="modal-body">
				<div id="wrapper">
					<div id="container">
						<div id="uploader" class="attach">
							<div class="queueList">
								<div id="dndArea" class="placeholder">
									<div id="filePicker"></div>
									<p></p>
								</div>
							</div>
							<div class="statusBar" style="display:none;">
								<div class="progress">
									<span class="text">0%</span>
									<span class="percentage"></span>
								</div>
								<div class="info"></div>
								<div class="btns">
									<div id="filePickerBtn" class="attachBtn"></div>
									<div class="uploadBtn">开始上传</div>
								</div>
							</div>
						</div>
					</div>
				</div>
			</div>
			<div class="modal-footer form-btn">
				<button class="btn dark" type="button" id="closeModalBtn" data-dismiss="modal">关 闭</button>
			</div>
		</div>
	</div>
</div>
```
```html
<!--  显示列表  -->
<a class="btn dark" type="button" data-target="#file-edit"  role="button" data-toggle="modal">附件</a>
<ul id="attachList"></ul>
<!--  上传头像  -->
<img id="portalPicImg" alt="上传头像" width="105" height="105" src="${sysPath}/images/demoimg/iphoto.jpg" style="display: block;">
<a class="btn dark" type="button" data-target="#file-edit3"  role="button" data-toggle="modal">上传头像</a>
```
