package com.boardgame.common.error;

public record ErrorResponse(int status, String code, String message) {

    public static ErrorResponse of(ErrorCode errorCode) {
        return new ErrorResponse(errorCode.statusCode(), errorCode.code(), errorCode.message());
    }
}
