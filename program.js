var parallel = require('array-parallel');
var request = require('superagent');

module.exports = function (context) {
	var gl = context;

	var Program = function () {
		Program.prototype.init.apply(this, arguments);
	};

	Program.prototype.init = function (options) {
		this.vShaderUrl = options.vShaderUrl;
		this.fShaderUrl = options.fShaderUrl;
		this.vShaderSource = options.vShaderSource || null;
		this.fShaderSource = options.fShaderSource || null;
		this.program = gl.createProgram();
		this.params = {};

	};

	Program.prototype.prepare = function (done) {
		var that = this;
		this.load(function(err, result) {
			if(err) return done(err);

			var shaders = that.compile();
			that.link.apply(that, shaders);
			done(null);
		});
	};

	Program.prototype.compile = function (type) {
		if (typeof type === 'undefined') {
			return [this.compile(gl.VERTEX_SHADER), this.compile(gl.FRAGMENT_SHADER)];
		}
		var shader = gl.createShader(type);
		if (type === gl.VERTEX_SHADER) {
			gl.shaderSource(shader, this.vShaderSource);
		}
		if (type === gl.FRAGMENT_SHADER) {
			gl.shaderSource(shader, this.fShaderSource);
		}

		gl.compileShader(shader);

		if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
			alert(gl.getShaderInfoLog(shader));
			return null;
		}
		return shader;
	};

	Program.prototype.link = function (vShader, fShader) {
		gl.attachShader(this.program, vShader);
		gl.attachShader(this.program, fShader);
		gl.linkProgram(this.program);

		if (!gl.getProgramParameter(this.program, gl.LINK_STATUS)) {
			alert('Could not initialise shaders');
			return;
		}
		//prg.vertexPositionAttribute = gl.getAttribLocation(prg, 'aVertexPosition');
		//prg.pMatrixUniform          = gl.getUniformLocation(prg, 'uPMatrix');
		//prg.mvMatrixUniform         = gl.getUniformLocation(prg, 'uMVMatrix');
	};

	Program.prototype.bind = function () {
		gl.useProgram(this.program);
	};

	Program.prototype.unbind = function () {
		gl.useProgram(null);
	};

	Program.prototype._getParamType = function (paramName) {
		if (!paramName) return void(0);
		var TYPES = {'a': 'attrib', 'u': 'uniform'};
		return TYPES[paramName[0]];
	};

	Program.prototype.getParamLocations = function (params) {
		for (var i = 0, len = params.length; i < len; i += 1) {
			var param = params[i];
			switch (this._getParamType(param)) {
				case 'attrib':
					//TODO: test that result value >= 0
					this.params[param] = gl.getAttribLocation(this.program, param);
					break;
				case 'uniform':
					//TODO: test that result value != null
					this.params[param] = gl.getUniformLocation(this.program, param);
			}
		}
	};

	Program.prototype.load = function(done) {
		var that = this;
		parallel([
			function (cb) {
				request.get('/shaders/' + that.vShaderUrl).end(function(err, res) {
					if (err) return cb(err);
					console.log('Response: ', res.text);
					cb(null, res.text);
				});
			},
			function (cb) {
				request.get('/shaders/' + that.fShaderUrl).end(function(err, res) {
					if (err) return cb(err);
					console.log('Response: ', res.text);
					cb(null, res.text);
				});
			}
		],
			function(err, result) {
				if (err) return done(err);
				that.vShaderSource = result[0];
				that.fShaderSource = result[1];
				done(null);
			}
		);
	};

	return Program;
};