package com.boardgame.common.error;

import org.springframework.http.HttpStatus;

public enum ErrorCode {
    INVALID_INPUT(HttpStatus.BAD_REQUEST, "입력값이 올바르지 않습니다."),
    INTERNAL_ERROR(HttpStatus.INTERNAL_SERVER_ERROR, "일시적인 오류가 발생했습니다. 잠시 후 다시 시도해 주세요."),
    NOT_FOUND(HttpStatus.NOT_FOUND, "요청한 경로를 찾을 수 없습니다."),
    METHOD_NOT_ALLOWED(HttpStatus.METHOD_NOT_ALLOWED, "지원하지 않는 요청 방식입니다."),

    INVALID_PLAYER_COUNT(HttpStatus.BAD_REQUEST, "페이퍼 사파리는 2~5명이 플레이할 수 있습니다."),
    NOT_A_PLAYER(HttpStatus.FORBIDDEN, "이 게임의 참가자가 아닙니다."),
    NOT_YOUR_TURN(HttpStatus.CONFLICT, "지금은 당신의 차례가 아닙니다."),
    INVALID_PHASE(HttpStatus.CONFLICT, "지금은 할 수 없는 행동입니다."),
    INVALID_POSITION(HttpStatus.BAD_REQUEST, "잘못된 카드 위치입니다."),
    ALREADY_FLIPPED(HttpStatus.CONFLICT, "이미 카드를 한 장 뒤집었습니다."),
    NOT_FACE_DOWN(HttpStatus.BAD_REQUEST, "뒷면인 카드만 선택할 수 있습니다."),
    MUST_SWAP_DISCARD_CARD(HttpStatus.BAD_REQUEST, "버린 카드 더미에서 가져온 카드는 반드시 교체해야 합니다."),
    MUST_SWAP_TARZAN(HttpStatus.BAD_REQUEST, "타잔 카드는 반드시 교체해야 합니다."),
    EMPTY_DISCARD_PILE(HttpStatus.CONFLICT, "버린 카드 더미가 비어 있습니다."),
    DECK_EXHAUSTED(HttpStatus.CONFLICT, "더 이상 뽑을 카드가 없습니다."),
    ROUND_NOT_OVER(HttpStatus.CONFLICT, "라운드가 아직 끝나지 않았습니다."),
    GAME_ALREADY_OVER(HttpStatus.CONFLICT, "이미 끝난 게임입니다.");

    private final HttpStatus status;
    private final String message;

    ErrorCode(HttpStatus status, String message) {
        this.status = status;
        this.message = message;
    }

    public HttpStatus status() {
        return status;
    }

    public int statusCode() {
        return status.value();
    }

    public String code() {
        return name();
    }

    public String message() {
        return message;
    }
}
