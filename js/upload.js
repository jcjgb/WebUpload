var attachPool = {};
attachPool.pushUpload = (function(delay){
    var pools = [] , 
    isRunning = false ;
    function walk(){
        var runner = pools.shift();
        if( runner ){
            setTimeout( function(){
            	if(!pools.length) isRunning = false;
                runner( walk );
            } , delay );  
        }
    }
    return {
        add : function( fn ){
            pools.push( fn );
            this.run();
        } ,
        run : function(){
            if( !isRunning ){
                isRunning = true ;
                walk();
            }
        }
    };
})(150);
/**
 * 添加附件配置，实例化一个AttachUploader
 */
attachPool.add = function(options){
	attachPool.pushUpload.add(function(routine){
		new AttachUploader(options);
        routine();
    });
};
/**
 * 查询已上传附件
 * @Examples
 * attachPool.getUploadeder({
 * 		form : {
 * 		 	businessId: $('#id').val(),
 *        	businessTable: 'toa_im_info',
 *        	category: 'portal1'
 * 		},
 * 		iscopy : 1    //可不填写，默认0
 * },function(files){
 *      alert("查询到的结果集");
 * });
 */
attachPool.updateUploader = function(option,callback){
	if(option){
		AttachUploader.getList(option,callback);
	}
};
/**
 * 获取当前页面所有已上传附件
 * 若无符合webupload上传文件的变量则返回 null
 * @Examples
 *  var files = attachPool.getFiles();
 *  if(files) formData.push({"name": "fileids", "value": files });
 */
attachPool.getFiles = function(){
	var inputs = document.getElementsByTagName("input"),
	    reflut = [];
	for(var i = 0;i < inputs.length;i++){
	    if(inputs[i].name == 'fileid') reflut.push(inputs[i].value);
	}
	return reflut.length?reflut:null;
};
/**
 * 文件转换字节
 * @param  {[type]} num [文件字节数]
 * @Examples
 * var size = attachPool.formatSize(233021);
 * onsole.log(size); //227.56 KB
 */
attachPool.formatSize = function(num){
    var digits = 2,
        number = num / 1024;
    var result =  Math.round(number*Math.pow(10,digits))/Math.pow(10,digits);
    if(result > 1024){
        number = result / 1024;
        return Math.round(number*Math.pow(10,digits))/Math.pow(10,digits)+' M';
    }else{
        return result+' KB';
    }
};
/**
 * 清空文件队列
 * @param id      容器id，用于获取当前upload对象
 */
attachPool.clearFileQueue = function(id){
	var upload = AttachUploader.getUploadPool(id);
	if(upload){
		var files = upload.getFiles();
		if(files.length){
			for(var i = 0; i < files.length;i++){
				var file = files[i];
				upload.removeFile(file,true);
			}
		}
	}
};

attachPool.getUploader = function(key){
	return AttachUploader.uploadPool[key] || null;
}
/**
 * AttachUploader   上传附件类
 * 参数详解
 * @param	falg				页面列表是否显示删除按钮  x							默认 true
 * @param	businessId			业务ID。												必填
 * @param	category			转发文复制附件  || 转发文复制附件和正文转成附件		必填
 * 			如果是附件并且页面需要回显图片参数中需带有Img    如:  picImg(注：唯一且fileNumLimit必须唯 1)	
 * @param	businessTable		具体操作那张业务表									必填
 * @param	iscopy				附件回显url类型										默认 0
 * @param	dndArea				加载上传附件显示按钮区域								默认 #dndArea
 * @param	containerId			upload容器id											默认 #uploader
 * @param	uploadInitId		插件初始化后按钮id									默认 #filePicker
 * @param	uploadInitLabel		插件初始化后按钮label								默认 点击选择
 * @param   fileNumLimit		显示上传文件数量										默认 30
 * @param	accept				限制上传格式参数										默认 null 不限制
 * @param	addButton			添加按钮的id和label									默认 
 * 								默认 {id:"#filePickerBtn",label:"继续添加"}  fileNumLimit为1的时候无需添加此参数
 * @param   server				上传文件服务器地址									默认 upload.action
 * @param	listId				页面列表容器的id										默认 #attachList
 * @param	isEcho				是否要回显附件										默认 false
 * @param	toButtonView		按钮点击无响应处理									默认 null
 * 			按钮点击无响应仅限于当前页面单独弹出的情况下，如邮件的转发，回复,或者多个弹出层等。。
 * 			参数应对应页面附件按钮的id，即点击页面附件按钮待弹出层出现后再次计算上传附件按钮的宽高
 * @param	error				删除回调事件
 * 			error : function(id,name){
 * 				id    = 当前附件的id
 * 				name  = 当前附件的name
 * 			}
 * @param	success				上传成功回调事件 调用方式同上
 * @param	ready				插件加载完成回调
 * @param	drawPage			页面绘制函数，如添加原有点击上传按钮页面加载列表将不再执行
 */
!(function($){
function AttachUpload(options) {
	var defult = {
				containerId		: '#uploader',
				listId			: '#attachList',
				addButton		: {
					id 		: '#filePickerBtn',
					label	: '继续添加'
				},
				uploadInitId	: '#filePicker',
				uploadInitLabel : '点击选择',
				fileNumLimit	: 30,
				accept			: null,
				iscopy			: 0,
				dndArea			: '#dndArea',
				server			: getRootPath() + '/content/attach/upload.action',
				falg 			: true,
				isEcho			: false,
				showFileSize   	: false,
				toButtonView	: null,
				success			: null,
				delCallback		: null,
				ready			: null,
				drawPage		: null,
				queueStyle      : 'default'
		};
	var opt = $.extend({}, defult, options);
	this.initialize(opt);
}

//存储上传成功的文件对象信息
AttachUpload.fileObjArray = [];
//存储每一个实例化的upload对象
AttachUpload.uploadPool = [];
//upload  SET方法
AttachUpload.setUploadPool = function(key,value){
	AttachUpload.uploadPool[key] = value;
};
//upload  GET方法
AttachUpload.getUploadPool = function(key){
	return AttachUpload.uploadPool[key];
};

AttachUpload.prototype = {
	/**
	 * 初始化webupload
	 */
	initialize : function(option) {
		var such = this;
		such.option			= option,
		//uploadID
		such.attachId  		= such.option.containerId,
		//upload容器
		such.$wrap			= $(such.option.containerId),
		// 图片容器
		such.$queue			= $( '<ul class="filelist"></ul>' ).appendTo( such.$wrap.find( '.queueList' ) ),
		// 状态栏，包括进度和控制按钮
		such.$statusBar		= such.$wrap.find( '.statusBar' ),
		// 文件总体选择信息
		such.$info			= such.$statusBar.find( '.info' ),
		//上传按钮
		such.$upload		= such.$wrap.find( '.uploadBtn' ),
		// 没选择文件之前的内容。
        such.$placeHolder	= such.$wrap.find( '.placeholder' ),
        //上传进度条
        such.$progress		= such.$statusBar.find( '.progress' ).hide(),
        // 添加的文件数量
        such.fileCount		= 0,
        // 添加的文件总大小
        such.fileSize		= 0,
        // 优化retina, 在retina下这个值是2
        such.ratio			= window.devicePixelRatio || 1,
        // 缩略图大小
        such.thumbnailWidth = 110 * such.ratio,
        such.thumbnailHeight= 110 * such.ratio,
        // 可能有pedding, ready, uploading, confirm, done.
        such.state			= 'pedding',
        // 所有文件的进度信息，key为file id
        such.percentages	= {},
        // WebUploader实例
        such.uploader		= such.getExamples(),
        // 判断浏览器是否支持图片的base64
        such.isSupportBase64 = ( function() {
            var data = new Image();
            var support = true;
            data.onload = data.onerror = function() {
                if( this.width != 1 || this.height != 1 ) {
                    support = false;
                }
            };
            data.src = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==";
            return support;
        })(),
        // 检测是否已经安装flash，检测flash的版本
        such.flashVersion = ( function() {
            var version;
            try {
                version = navigator.plugins[ 'Shockwave Flash' ];
                version = version.description;
            } catch ( ex ) {
                try {
                    version = new ActiveXObject('ShockwaveFlash.ShockwaveFlash')
                            .GetVariable('$version');
                } catch ( ex2 ) {
                    version = '0.0';
                }
            }
            version = version.match( /\d+/g );
            return parseFloat( version[ 0 ] + '.' + version[ 1 ], 10 );
        } )(),
        such.supportTransition = (function(){
            var s = document.createElement('p').style,
                r = 'transition' in s ||
                        'WebkitTransition' in s ||
                        'MozTransition' in s ||
                        'msTransition' in s ||
                        'OTransition' in s;
            s = null;
            return r;
        })();
		
		such.executeUpload(such.option);
	},
	executeUpload : function(option){
		var such = this;
		if ( !WebUploader.Uploader.support('flash') && WebUploader.browser.ie ) {
            // flash 安装了但是版本过低。
            if (flashVersion) {
                (function(container) {
                    window['expressinstallcallback'] = function( state ) {
                        switch(state) {
                            case 'Download.Cancelled':
                                alert('您取消了更新！');
                                break;
                            case 'Download.Failed':
                                alert('安装失败');
                                break;

                            default:
                                alert('安装已成功，请刷新！');
                                break;
                        }
                        delete window['expressinstallcallback'];
                    };
                    var swf = 'expressInstall.swf';
                    // insert flash object
                    var html = '<object type="application/' +
                            'x-shockwave-flash" data="' +  swf + '" ';

                    if (WebUploader.browser.ie) {
                        html += 'classid="clsid:d27cdb6e-ae6d-11cf-96b8-444553540000" ';
                    }
                    html += 'width="100%" height="100%" style="outline:0">'  +
                        '<param name="movie" value="' + swf + '" />' +
                        '<param name="wmode" value="transparent" />' +
                        '<param name="allowscriptaccess" value="always" />' +
                    '</object>';

                    container.html(html);
                })(such.$wrap);
            // 压根就没有安转。
            } else {
                such.$wrap.html('<a href="http://www.adobe.com/go/getflashplayer" target="_blank" border="0"><img alt="get flash player" src="http://www.adobe.com/macromedia/style_guide/images/160x41_Get_Flash_Player.jpg" /></a>');
            }
            return false;
        } else if (!WebUploader.Uploader.support()) {
            alert( 'Web Uploader 不支持您的浏览器！');
            return false;
        }

	   such.uploader = such.createUpload(option);
	   AttachUpload.setUploadPool(option.containerId,such.uploader);
       such.addOnEvent(such.uploader,option);
       if(option.isEcho) AttachUpload.getList(option);
       setTimeout(function(){if(typeof option.ready === 'function') option.ready.call(null);},0);
	},
	/**
	 * 创建webupload对象
	 */
	createUpload : function(option) {
		// 实例化
        return WebUploader.create({
            pick: {
                id: option.uploadInitId,
                label: option.uploadInitLabel
            },
            formData: {
          		businessId :option.form.businessId,
    			businessTable : option.form.businessTable,
    			category:option.form.category
            },
            dnd: option.dndArea,
            paste: option.uploadInitId,
            swf: '../../js/ueditor/third-party/webuploader/Uploader.swf',
            chunked: false,
            chunkSize: 512 * 1024,
            server: option.server,
            // runtimeOrder: 'flash',

            accept: option.accept,

            // 禁掉全局的拖拽功能。这样不会出现图片拖进页面的时候，把图片打开。
            disableGlobalDnd: true,
            fileNumLimit: option.fileNumLimit,//限制上传个数
            fileSizeLimit: 200 * 1024 * 1024,    // 200 M 限制上传文件大小总量
            fileSingleSizeLimit: 50 * 1024 * 1024    // 50 M 限制单个上传文件大小
        });

	},
	addFile : function(file,instance){
		var such = this;
		
		var suffix = (function(){
			var str = file.name.substring(file.name.lastIndexOf('.') + 1);
			if(str.length > 4){
				str = str.substring(0,4);
			}
			return str;
		})();
		
		var $li = $('<li id="' + file.id + '" class="'+file.id+'">' +
                    	'<p class="title">' + file.name + '</p>' +
                    	'<p class="imgWrap"></p>'+
                    	'<p class="progress"><span></span></p></li>' ),
            $btns 	  = $('<div class="file-panel"><span class="cancel">删除</span></div>').appendTo( $li ),
            $prgress  = $li.find('p.progress span'),
            $wrap 	  = $li.find( 'p.imgWrap' ),
            $info 	  = $('<p class="error"></p>'),
            showError = function( code ) {
                switch( code ) {
                    case 'exceed_size':
                        text = '文件大小超出';
                        break;
                    case 'interrupt':
                        text = '上传暂停';
                        break;
                    default:
                        text = '上传失败，请重试';
                        break;
                }
                $info.text( text ).appendTo( $li );
            },
            isEchoFile = false;    //标识当前文件是否是回显
            if ( file.getStatus() === 'invalid' ) {
                showError( file.statusText );
            } else {
            	//如果是回显的数据自动添加缩略图 
            	var reg = new RegExp( "\.gif$|\.jpg$|\.jpeg$|\.png$|\.GIF$|\.JPG$|\.PNG$|\.BMP$|\.bmp$", 'i' );
            	if(typeof file.__hash != "number"){
            		isEchoFile = true;
            		if(reg.test(file.name)){
            			var path = file.source.source.url;
                		if(path){
                			//"这里随意定$&"  替换掉刷选的代码
                			img = $('<img width="110" height="110" src="'+path.replace(reg,"-thumbnail.png")+'">');
                            $wrap.empty().append( img );
                		}
            		}else{
            			if(such.option.queueStyle === 'block') $li.addClass('dontImg');
            			$wrap.text(suffix);
            		}
            		$btns.height(30);
            		AttachUpload.getUploadPool(instance).skipFile(file);
            		$li.append( '<span class="success"></span>' ).addClass( 'state-complete' );
            		//$li.find('p.progress').hide();
            	}else{
            		 $wrap.text( '预览中' );
            		 AttachUpload.getUploadPool(instance).makeThumb( file, function( error, src ) {
                         var img;
                         if ( error ) { $wrap.text(suffix);if(such.option.queueStyle === 'block') $li.addClass('dontImg');  return; }
                         if( such.isSupportBase64 ) {
                             img = $('<img src="'+src+'">');
                             $wrap.empty().append( img );
                         } else {
                             $.ajax('../../server/preview.php', {
                                 method: 'POST',
                                 data: src,
                                 dataType:'json'
                             }).done(function( response ) {
                                 if (response.result) {
                                     img = $('<img src="'+response.result+'">');
                                     $wrap.empty().append( img );
                                 } else {
                                     $wrap.text("预览出错");
                                 }
                             });
                         }
                     }, such.thumbnailWidth, such.thumbnailHeight );
            	}
                such.percentages[ file.id ] = [ file.size, 0 ];
                file.rotation = 0;
            }

            file.on('statuschange', function( cur, prev ) {
                if ( prev === 'progress' ) {
                    $prgress.hide().width(0);
                } else if ( prev === 'queued' ) {
                    $li.off( 'mouseenter mouseleave' );
                   // $btns.remove();
                }
                // 成功
                if ( cur === 'error' || cur === 'invalid' ) {
                    showError( file.statusText );
                    such.percentages[ file.id ][ 1 ] = 1;
                } else if ( cur === 'interrupt' ) {
                    showError( 'interrupt' );
                } else if ( cur === 'queued' ) {
                    such.percentages[ file.id ][ 1 ] = 0;
                } else if ( cur === 'progress' ) {
                    $info.remove();
                    $prgress.css('display', 'block');
                } else if ( cur === 'complete' ) {
                    $li.append( '<span class="success"></span>' );
                    //if(typeof such.option.successFun === 'function') such.option.successFun.call(this,file);
                }
                $li.removeClass( 'state-' + prev ).addClass( 'state-' + cur );
            });
            
            if(!isEchoFile){
            	$li.on( 'mouseenter', function() {
                    $btns.stop().animate({height: 30});
                });
                $li.on( 'mouseleave', function() {
                    $btns.stop().animate({height: 0});
                });
            }

            $btns.on( 'click', 'span', function() {
            	such.uploader.removeFile( file );
            });
            $li.appendTo( such.$queue );
	},
	removeFile : function(file){
		var such = this;
		var $li = $('#'+file.id);
        delete such.percentages[ file.id ];
        such.updateTotalProgress();
        $li.off().find('.file-panel').off().end().remove();
        //同步删除外部附件
        if($("#up"+file.id)) $("#up"+file.id).remove();
        var del = such.option.delCallback;
        if(typeof del === 'function') del.call(undefined,file.id,file.name);
	},
	updateTotalProgress : function(){
		var such = this,
			loaded = 0,
            total = 0,
            spans = such.$progress.children(),
            percent;
        $.each( such.percentages, function( k, v ) {
            total += v[ 0 ];
            loaded += v[ 0 ] * v[ 1 ];
        } );
        percent = total ? loaded / total : 0;

        spans.eq( 0 ).text( Math.round( percent * 100 ) + '%' );
        spans.eq( 1 ).css( 'width', Math.round( percent * 100 ) + '%' );
        such.updateStatus();
	},
	updateStatus : function(){
		var such = this,text = '', stats;
        if ( such.state === 'ready' ) {
            text = '选中' + such.fileCount + '个文件。';
        }else {
            stats = such.uploader.getStats();
            text = '共' + such.fileCount + '张';
            if ( stats.uploadFailNum ) {
                text += '，失败' + stats.uploadFailNum + '张';
            }
        }
        such.$info.html( text );
	},
	setState : function(val){
		var file, stats,such = this;
        if ( val === such.state ) return;
        such.$upload.removeClass( 'state-' + such.state );
        such.$upload.addClass( 'state-' + val );
        such.state = val;
        switch ( such.state ) {
            case 'pedding':
            	var imgDoc = such.option.form.category;
            	if(imgDoc.indexOf("Img") != -1)$("#"+imgDoc).attr("src",getRootPath()+'/images/demoimg/iphoto.jpg');
                such.$placeHolder.removeClass( 'element-invisible' );
                such.$queue.hide();
                such.$statusBar.addClass( 'element-invisible' );
                such.uploader.refresh();
                break;
            case 'ready':
                such.$placeHolder.addClass( 'element-invisible' );
                $(such.option.addButton.id).removeClass( 'element-invisible');
                such.$queue.show();
                such.$statusBar.removeClass('element-invisible');
                such.uploader.refresh();
                break;
            case 'uploading':
                $(such.option.addButton.id).addClass( 'element-invisible' );
                such.$progress.show();
                such.$upload.text( '暂停上传' );
                break;
            case 'paused':
                such.$progress.show();
                such.$upload.text( '继续上传' );
                break;
            case 'confirm':
                such.$progress.hide();
                $(such.option.addButton.id).removeClass( 'element-invisible' );
                such.$upload.text( '开始上传' );
                stats = such.uploader.getStats();
                if ( stats.successNum && !stats.uploadFailNum ) {
                	such.setState( 'finish' );
                    return;
                }
                break;
            case 'finish':
                stats = such.uploader.getStats();
                if ( stats.successNum ) {
                	//上传成功
                	such.$queue.find(".file-panel").height(30);
                } else {
                    // 没有成功的图片，重设
                    state = 'done';
                    location.reload();
                }
                break;
        }
        such.updateStatus();
	},
	getExamples : function(){
		return new Object();
	},
	addOnEvent : function(load,opt){
		var such = this;
		// 拖拽时不接受 js, txt 文件。
        load.on( 'dndAccept', function( items ) {
            var denied = false,
                len = items.length,
                i = 0,
                // 修改js类型
                unAllowed = 'text/plain;application/javascript ';
            for ( ; i < len; i++ ) {
                // 如果在列表里面
                if ( ~unAllowed.indexOf( items[ i ].type ) ) {
                    denied = true;
                    break;
                }
            }
            return !denied;
        });
        // 添加“添加文件”的按钮，
        if(opt.fileNumLimit > 1){
        	load.addButton({
                id: opt.addButton.id,
                label: opt.addButton.label
            });
        }
        /**
         * 监听上传成功
         */
        load.on( 'uploadSuccess', function( file, response ) {
        	var relt = JSON.parse(response._raw);
        	if(typeof opt.drawPage === 'function'){
        		opt.drawPage.call(null,relt.files[0],file);
			}else{
				AttachUpload.showAttachList(opt.falg,relt.files[0],file,opt.listId,opt.containerId,opt.showFileSize);
			}
        	var successBack = such.option.success;
        	if(typeof successBack === 'function') successBack.call(undefined,file.id,file.name);
        });

        load.on( 'all', function( type ) {
            var stats;
            switch( type ) {
                case 'uploadFinished':
                    such.setState( 'confirm' );
                    break;

                case 'startUpload':
                    such.setState( 'uploading' );
                    break;

                case 'stopUpload':
                    such.setState( 'paused' );
                    break;

            }
        });
        /**
         * 上传进度
         */
        load.onUploadProgress = function( file, percentage ) {
            var $li = $('#'+file.id),
                $percent = $li.find('.progress span');

            $percent.css( 'width', percentage * 100 + '%' );
            such.percentages[ file.id ][ 1 ] = percentage;
            such.updateTotalProgress();
        };
        /**
         * 加入队列
         */
        load.onFileQueued = function( file ) {
            such.fileCount++;
            such.fileSize += file.size;

            if ( such.fileCount === 1 ) {
                such.$placeHolder.addClass( 'element-invisible' );
                such.$statusBar.show();
            }

            such.addFile( file ,such.option.containerId);
            such.setState( 'ready' );
            such.updateTotalProgress();
        };

        /**
         * 删除队列
         */
        load.onFileDequeued = function( file ) {
            such.fileCount--;
            such.fileSize -= file.size;
            if ( !such.fileCount ) {
                such.setState( 'pedding' );
            }

            such.removeFile( file );
            such.updateTotalProgress();
        };
        
        load.onError = function( code ) {
        	if('F_DUPLICATE' == code)
        		msgBox.tip({
        			type:'fail',//图片上传重复
        			content:'\u6587\u4ef6\u4e0a\u4f20\u91cd\u590d'
        		});
        	else if("Q_EXCEED_NUM_LIMIT" == code)
        		msgBox.tip({
        			type:'fail',//超出最大数量
        			content:'\u8d85\u51fa\u6700\u5927\u6570'
        		});
        	else
        		alert( 'Eroor: ' + code );
        };
        /**
         * [上传按钮绑定事件]
         */
        such.$upload.on('click', function() {
            if ( $(this).hasClass( 'disabled' ) ) {
                return false;
            }
            if ( such.state === 'ready' ) {
                such.uploader.upload();
            } else if ( such.state === 'paused' ) {
                such.uploader.upload();
            } else if ( such.state === 'uploading' ) {
                such.uploader.stop();
            }
        });
        
        such.$info.on( 'click', '.retry', function() {
            such.uploader.retry();
        } );
        
        such.$info.on( 'click', '.ignore', function() {
            alert( 'todo' );
        } );
        
        if(opt.toButtonView){
        	$(document).on("click",opt.toButtonView,function(){
            	setTimeout(function(){
            		such.uploader.refresh();
            	},310);
            });
        }
        
        such.$upload.addClass( 'state-' + such.state );
        such.updateTotalProgress();
	}
};
/**
 * [getList 获得已上传的附件]
 * @param   =>  是否显示按钮X
 * @return  =>  undefined
 */
AttachUpload.getList = function(option,callback) {
	//var isshow = $("#isshow").val();
	var businessId = option.form.businessId;
	var businessTable = option.form.businessTable;
	var category = option.form.category;
	var iscopy = option.iscopy || 0;
	var url = getRootPath() + "/content/attach/attachlist.action";
	if (iscopy == "1") { //转发文复制附件
		url = getRootPath() + "/content/attach/copyAttachlist.action";
	}
	if (iscopy == "2") { //转发文复制附件和正文转成附件
		url = getRootPath() + "/content/attach/copyAttachAndTextList.action";
	}
	$.ajax({
		url: url,
		data: {
			"businessId": businessId,
			"businessTable": businessTable,
			"isPaged": "1",
			"category": category
		},
		dataType: 'json',
		async: false,
		success: function(data) {
			if (data.files.length) {
				if(typeof callback === 'function'){
					callback.call(undefined,data.files);
				}else{
					var relt = [],
					eachFile = data.files,
					uploadx;
					$.each(eachFile, function(i, o) {
						relt.push({
							name: o.fileName,
							size: o.fileSize,
							url: getRootPath() + "/upload/attach/" + o.resourcesName,
							type: 'image/jpeg',
							lastModified: +new Date(),
							lastModifiedDate: new Date(),
							webkitRelativePath: ""
						});
					});
					uploadx = AttachUpload.getUploadPool(option.containerId);
					uploadx.addFiles(uploadx.addEchoFile(relt));
					
					var ary = uploadx.getFiles();
					$.each(eachFile, function(i, o) {
						if(typeof option.drawPage === 'function'){
							option.drawPage.call(null,eachFile[i], ary[i]);
						}else{
							AttachUpload.showAttachList(option.falg, eachFile[i], ary[i],option.listId,option.containerId,option.showFileSize);
						}
					});
				}
			}
		}
	});
};
/**
 * [删除附件扩展方法（点击页面x调用）]
 * @param  {[String]}    fileid    		[文件输出在页面上的ID]
 * @param  {[String]}    key    		[description]
 */
AttachUpload.asynDel = function(fileid, key,instance) {
	var btn = $("#btn" + fileid);
	msgBox.confirm({
		content: $.i18n.prop("JC_SYS_034"),
		success: function() {
			if (AttachUpload.fileObjArray[key]) {
				btn.trigger("click");
				$("#up" + key).remove();
				AttachUpload.getUploadPool(instance).removeFile(AttachUpload.fileObjArray[key]);
				AttachUpload.fileObjArray[key] = null;
			}
		}
	});
};
function roundSize(num){
	var digits = 2,
		number = num / 1024;
    var result =  Math.round(number*Math.pow(10,digits))/Math.pow(10,digits);
    if(result > 1024){
    	number = result / 1024;
    	return Math.round(number*Math.pow(10,digits))/Math.pow(10,digits)+' M';
    }else{
    	return result+' KB';
    }
} 
AttachUpload.showAttachList = function(flag, file, webfile,listId,instance,size){
	var str = "",
		aList = $(listId);
	if(typeof file != "undefined"){
		if(file.category.indexOf("Img") != -1){
			var eUrl = getRootPath()+"/upload/attach/"+file.resourcesName;
			$("#"+file.category+"File").remove();
			$("#"+file.category).attr("src",eUrl).after("<input type='hidden' id='"+file.category+"File' name='fileid' value='"+file.id+"' path='upload/attach/"+file.resourcesName+"'>");
		}else{
			var dUrl = getRootPath()+file.url+"?fileName="+encodeURIComponent(encodeURIComponent(file.fileName))+"&resourcesName="+file.resourcesName;
			if (flag){
				AttachUpload.fileObjArray[webfile.id] = webfile;
				str += "<li id=\"up"+webfile.id+"\"><a href='" + dUrl
					+ "'><i class='fa fa-paper-clip m-r-sm'></i>"
					+ file.fileName + "</a>&nbsp;"+(size?roundSize(file.fileSize):'')+"&nbsp;"
					+ "<input type='hidden' name='fileid' value='"+file.id+"' />"
					+ '<a href="#" style="margin-left:15px;" onclick=\'AttachUploader.asynDel("'+file.id+'","'+webfile.id+'","'+instance+'");\'>x</a></li>';
			}else{
				str += "<li id=\"up"+webfile.id+"\">"
					+ "<input type='hidden' name='fileid' value='"+file.id+"' />"
					+"<a href='" + dUrl + "'><i class='fa fa-paper-clip m-r-sm'></i>"
					+ file.fileName + "</a>&nbsp;&nbsp;&nbsp; "+(size?roundSize(file.fileSize):'')+"</li>";
			}
			aList.append(str);
		}
	}
};
window.AttachUploader = AttachUpload;
})(jQuery);
