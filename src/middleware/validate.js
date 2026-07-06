function formatValidationError(error) {
  return error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`).join('; ');
}

export function validate(schema, source = 'body') {
  return (req, _res, next) => {
    const result = schema.safeParse(req[source]);

    if (!result.success) {
      const err = new Error(formatValidationError(result.error));
      err.statusCode = 400;
      err.code = 'VALIDATION_ERROR';
      next(err);
      return;
    }

    req[source] = result.data;
    next();
  };
}
