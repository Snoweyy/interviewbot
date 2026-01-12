import ast

def analyze_code(code: str):
    tree = ast.parse(code)

    loops = sum(isinstance(n, (ast.For, ast.While)) for n in ast.walk(tree))
    functions = sum(isinstance(n, ast.FunctionDef) for n in ast.walk(tree))
    recursion = False

    for node in ast.walk(tree):
        if isinstance(node, ast.Call) and isinstance(node.func, ast.Name):
            recursion = True

    return {
        "loops": loops,
        "functions": functions,
        "recursion": recursion
    }
