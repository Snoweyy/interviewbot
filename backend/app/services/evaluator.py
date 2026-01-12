def evaluate_code(output, expected):
    score = 0

    if output == expected:
        score += 70

    if len(output) > 0:
        score += 10

    # Later:
    # - loop detection
    # - recursion check
    # - time complexity

    return score
