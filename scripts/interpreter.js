/* global SLang : true, parser, console  */
/* 
    Zach Tjugum, Mitchell Bricco, Jarrett Buchholz
    In file interpreter.js we would replace line 77 with 

    			    E.update(envir,
    
*/
(function () {

    "use strict";

    var A = SLang.absyn;
    var E = SLang.env;
    var ppm = "byval";   

function nth(n) {
    switch (n+1) {
    case 1: return "first";
    case 2: return "second";
    case 3: return "third";
    default: return (n+1) + "th";
    }
}
function typeCheckPrimitiveOp(op,args,typeCheckerFunctions) {
    var numArgs = typeCheckerFunctions.length;
    if (args.length !== numArgs) {
	throw "Wrong number of arguments given to '" + op + "'.";
    }
    for( var index = 0; index<numArgs; index++) {
	if ( ! (typeCheckerFunctions[index])(args[index]) ) {
	    throw "The " + nth(index) + " argument of '" + op + "' has the wrong type.";
	}
    }
}
function applyPrimitive(prim,args) {
    switch (prim) {
    case "+": 
	typeCheckPrimitiveOp(prim,args,[E.isNum,E.isNum]);
	return E.createNum( E.getNumValue(args[0]) + E.getNumValue(args[1]));
    case "-": 
	typeCheckPrimitiveOp(prim,args,[E.isNum,E.isNum]);
	return E.createNum( E.getNumValue(args[0]) - E.getNumValue(args[1]));
    case "*": 
	typeCheckPrimitiveOp(prim,args,[E.isNum,E.isNum]);
	return E.createNum( E.getNumValue(args[0]) * E.getNumValue(args[1]));
    case "/": 
	typeCheckPrimitiveOp(prim,args,[E.isNum,E.isNum]);
	return E.createNum( E.getNumValue(args[0]) / E.getNumValue(args[1]));
    case "%": 
	typeCheckPrimitiveOp(prim,args,[E.isNum,E.isNum]);
	return E.createNum( E.getNumValue(args[0]) % E.getNumValue(args[1]));
    case "<": 
	typeCheckPrimitiveOp(prim,args,[E.isNum,E.isNum]);
	return E.createBool( E.getNumValue(args[0]) < E.getNumValue(args[1]));
    case ">": 
	typeCheckPrimitiveOp(prim,args,[E.isNum,E.isNum]);
	return E.createBool( E.getNumValue(args[0]) > E.getNumValue(args[1]));
    case "===": 
	typeCheckPrimitiveOp(prim,args,[E.isNum,E.isNum]);
	return E.createBool( E.getNumValue(args[0]) === E.getNumValue(args[1]));
    case "add1": 
	typeCheckPrimitiveOp(prim,args,[E.isNum]);
	return E.createNum( 1 + E.getNumValue(args[0]) );
    case "~": 
	typeCheckPrimitiveOp(prim,args,[E.isNum]);
	return E.createNum( - E.getNumValue(args[0]) );
    case "not": 
	typeCheckPrimitiveOp(prim,args,[E.isBool]);
	return E.createBool( ! E.getBoolValue(args[0]) );
    }
}
function callByValue(exp,envir) {
    var f = evalExp(A.getAppExpFn(exp),envir);
    var args = evalExps(A.getAppExpArgs(exp),envir);
    if (E.isClo(f)) {
	if (E.getCloParams(f).length !== args.length) {		
	    throw new Error("Runtime error: wrong number of arguments in " +
                            "a function call (" + E.getCloParams(f).length +
			    " expected but " + args.length + " given)");
	} else {
	    var values = evalExps(E.getCloBody(f),
			          E.update(E.getCloEnv(f),
					   E.getCloParams(f),args));
	    return values[values.length-1];
	}
    } else {
	throw f + " is not a closure and thus cannot be applied.";
    }    
}

function evalExp(exp,envir) {
    var body, bindings, values;
    if (A.isIntExp(exp)) {
	return E.createNum(A.getIntExpValue(exp));
    }
    else if (A.isVarExp(exp)) {
	return E.lookup(envir,A.getVarExpId(exp));
    } else if (A.isPrintExp(exp)) {
	console.log( JSON.stringify(
	    evalExp( A.getPrintExpExp(exp), envir )));
    } else if (A.isPrint2Exp(exp)) {
	console.log( A.getPrint2ExpString(exp) +
		     (A.getPrint2ExpExp(exp) !== null ?
		      " " + JSON.stringify( evalExp( A.getPrint2ExpExp(exp), 
						     envir ) )
		      : ""));
    } else if (A.isAssignExp(exp)) {
	var v = evalExp(A.getAssignExpRHS(exp),envir);
	E.lookupReference(
                        envir,A.getAssignExpVar(exp))[0] = v;
	return v;
    } else if (A.isFnExp(exp)) {
	return E.createClo(A.getFnExpParams(exp),
				   A.getFnExpBody(exp),envir);
    } else if (A.isAppExp(exp)) {
	return callByValue(exp,envir);
    } else if (A.isPrim1AppExp(exp)) {
        return applyPrimitive(A.getPrim1AppExpPrim(exp),
			      [evalExp(A.getPrim1AppExpArg(exp),envir)]);
    } else if (A.isPrim2AppExp(exp)) {
        return applyPrimitive(A.getPrim2AppExpPrim(exp),
			      [evalExp(A.getPrim2AppExpArg1(exp),envir),
			       evalExp(A.getPrim2AppExpArg2(exp),envir)]);
    } else if (A.isIfExp(exp)) {
	if (E.getBoolValue(evalExp(A.getIfExpCond(exp),envir))) {
	    return evalExp(A.getIfExpThen(exp),envir);
	} else { 
	    return evalExp(A.getIfExpElse(exp),envir);
	}
    } else if (A.isLetsExp(exp)) {
        var bindings = A.getLetsExpBindings(exp);
        var body = A.getLetsExpBlock(exp);
        var params = bindings[0];
        var args = bindings[1];
        if(params.length === 0){
            var fnexp = A.createFnExp([],body);
            var appExp = SLang.absyn.createAppExp(fnexp,[]);
            return evalExp(appExp, envir);
        }
        else{
            envir = E.update(envir, params[0], [E.createNum(-1)]);
            E.lookupReference(
                         envir,params[0])[0] = evalExp(args[0],envir);
            params = params.slice(1);
            args = args.slice(1);
            bindings = [params,args];
            var letsexp = A.createLetsExp(bindings,body);
            evalExp(letsexp, envir);
        }
    } else if(A.isLetmrExp(exp)){
        var dummy = E.createClo(1,2,3);
        var fn1 = A.getLetmrExpfn1(exp);
        var fn2 = A.getLetmrExpfn2(exp);
        var body = A.getLetmrExpBlock(exp);
        var fn1Name = fn1[1];
        var fn2Name = fn2[1];
        envir = E.update(envir, [fn1Name,fn2Name], [dummy,dummy]);
        var clo1 = evalExp(A.getAssignExpRHS(fn1),envir);
        var clo2 = evalExp(A.getAssignExpRHS(fn2),envir);
        envir = E.update(envir, [fn1Name,fn2Name], [clo1,clo2]);
        E.lookupReference(E.getCloEnv(clo1),fn1Name)[0] = clo1;
        E.lookupReference(E.getCloEnv(clo2),fn2Name)[0] = clo2;
        var fnexp = A.createFnExp([],body);
        var appExp = SLang.absyn.createAppExp(fnexp,[]);
        return evalExp(appExp, envir);
    } else {
	throw "Error: Attempting to evaluate an invalid expression";
    }
}
function evalExps(list,envir) {
    return list.map( function(e) { return evalExp(e,envir); } );
}
function myEval(p) {
    if (A.isProgram(p)) {
	return evalExp(A.getProgramExp(p),E.initEnv());
    } else {
	window.alert( "The input is not a program.");
    }
}
function interpret(source,parameter_passing_mechanism) {
    var output='';
    var theParser = typeof grammar === 'undefined' ? parser : grammar;
    ppm = parameter_passing_mechanism || "byval";
    try {
        if (source === '') {
            window.alert('Nothing to interpret: you must provide some input!');
	} else {
	    var ast = theParser.parse(source);
	    var value = myEval( ast );
            return JSON.stringify(value);
        }
    } catch (exception) {
	window.alert(exception);
        return "No output [Runtime error]";
    }
    return output;
}

SLang.interpret = interpret; // make the interpreter public

}());
