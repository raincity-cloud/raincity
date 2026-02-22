export class AwsError extends Error {
  readonly code: string;
  readonly httpStatus: number | undefined;

  constructor(
    code: string,
    message: string | undefined,
    httpStatus: number | undefined,
  ) {
    super(message ?? code);
    this.code = code;
    this.httpStatus = httpStatus;
  }
}
