(function(define){
	"use strict";
	define(["./dcl-mini"], function(dcl){

		function nop(){}
		function err(msg){ throw Error("ERROR: " + msg); }

		var Advice = dcl(dcl._Super, {
			declaredClass: "dcl.Advice",
			constructor: function(){
				this.b = this.f.before;
				this.a = this.f.after;
				this.f = this.f.around;
			}
		});

		function stub(id, bases, name){
			var i = bases.length - 1, b = [], a = [], f;
			if(id < 3){
				f = dcl._chain(bases, name);
				f = dcl._stubChain(id < 2 ? f : f.reverse());
			}else{
				f = dcl._stubSuper(bases, name);
			}
			dcl._iterate(
				bases, name,
				function(f){
					if(f instanceof Advice){
						if(f.b){ b.push(f.b); }
						if(f.a){ a.push(f.a); }
					}
				},
				nop);
			if(!b.length && !a.length){
				// no before/after advices => fall back to a regular stub
				return f || new Function;
			}
			// AOP stub
			return makeAOPStub(dcl._stubChain(b), dcl._stubChain(a.reverse()), f);
		}

		function makeAOPStub(b, a, f){
			var sb = b || nop,
				sa = a || nop,
				sf = f || nop,
				t = function(){
					var r;
					// running the before chain
					sb.apply(this, arguments);
					// running the around chain
					try{
						r = sf.apply(this, arguments);
					}catch(e){
						r = e;
					}
					// running the after chain
					sa.call(this, r);
					if(r instanceof Error){
						throw r;
					}
				};
			t.advices = {b: b, a: a, f: f};
			return t;
		}

		function mixChains(dst, src){
			var n, d, s, t;
			for(n in src){
				d = +dst[n];
				s = +src[n];
				if(d != s){
					if(!d || s == 3){
						if(!d || s != 3){
							dst[n] = s;
						}
					}else{
						err("member function '" + n + "' has incompatible chaining");
					}
				}
			}
		}

		function buildStubs(chains, bases, proto){
			for(var name in chains){
				proto[name] = stub(chains[name], bases, name);
			}
		}

		dcl._setStubs(mixChains, buildStubs);

		dcl.advise = function(f){ return new Advice(f); }

		function chain(id){
			return function(ctor, name){
				var m = ctor._meta;
				if(m){
					if(m.bases.length > 1){
						err("chaining is being set on '" + name + "' for a class with non-null base");
					}
					m.chains[name] = id;
				}
			};
		}

		dcl.chainBefore = chain(1);
		dcl.chainAfter = chain(2);

		dcl.isInstanceOf = function(o, ctor){
			return o instanceof ctor || (o.constructor._meta && o.constructor._meta.bases.indexOf(ctor) >= 0);
		};

		return dcl;
	});
})(typeof define != "undefined" ? define : function(_, f){
	if(typeof module != "undefined"){
		module.exports = f(require("./dcl-mini"));
	}else{
		if(typeof dcl != "undefined"){
			dcl = f(dcl);  // describing a global
		}else{
			throw Error("Include dcl-mini.js before dcl.js");
		}
	}
});
