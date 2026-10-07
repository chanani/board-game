package com.boardgame.common.error;

import org.springframework.http.HttpStatus;

public enum ErrorCode {
    INVALID_INPUT(HttpStatus.BAD_REQUEST, "입력값이 올바르지 않습니다."),
    INTERNAL_ERROR(HttpStatus.INTERNAL_SERVER_ERROR, "일시적인 오류가 발생했습니다. 잠시 후 다시 시도해 주세요."),
    NOT_FOUND(HttpStatus.NOT_FOUND, "요청한 경로를 찾을 수 없습니다."),
    METHOD_NOT_ALLOWED(HttpStatus.METHOD_NOT_ALLOWED, "지원하지 않는 요청 방식입니다."),
    DATA_CONFLICT(HttpStatus.CONFLICT, "요청이 다른 요청과 겹쳤습니다. 잠시 후 다시 시도해 주세요."),

    UNAUTHORIZED(HttpStatus.UNAUTHORIZED, "로그인이 필요합니다."),
    DUPLICATE_LOGIN_ID(HttpStatus.CONFLICT, "이미 사용 중인 아이디입니다."),
    DUPLICATE_NICKNAME(HttpStatus.CONFLICT, "이미 사용 중인 닉네임입니다."),
    MEMBER_NOT_FOUND(HttpStatus.NOT_FOUND, "회원을 찾을 수 없습니다."),
    INVALID_LOGIN_ID(HttpStatus.BAD_REQUEST, "아이디는 4~20자의 영문과 숫자만 사용할 수 있습니다."),
    INVALID_NICKNAME(HttpStatus.BAD_REQUEST, "닉네임은 2~10자로 입력해 주세요."),
    INVALID_PASSWORD(HttpStatus.BAD_REQUEST, "비밀번호는 8~64자로 입력해 주세요. 한글은 24자까지 쓸 수 있습니다."),
    INVALID_CREDENTIALS(HttpStatus.UNAUTHORIZED, "아이디 또는 비밀번호가 올바르지 않습니다."),
    INVALID_AVATAR(HttpStatus.BAD_REQUEST, "고를 수 없는 프로필 사진이에요."),

    ROOM_NOT_FOUND(HttpStatus.NOT_FOUND, "방을 찾을 수 없습니다."),
    ROOM_FULL(HttpStatus.CONFLICT, "방이 가득 찼습니다."),
    ALREADY_IN_ROOM(HttpStatus.CONFLICT, "이미 다른 방에 참여 중입니다."),
    NOT_IN_ROOM(HttpStatus.FORBIDDEN, "이 방의 참가자가 아닙니다."),
    NOT_ROOM_HOST(HttpStatus.FORBIDDEN, "방장만 할 수 있습니다."),
    NOT_ENOUGH_PLAYERS(HttpStatus.CONFLICT, "인원이 부족해 시작할 수 없습니다."),
    ROOM_ALREADY_PLAYING(HttpStatus.CONFLICT, "이미 게임이 진행 중인 방입니다."),
    GAME_NOT_STARTED(HttpStatus.CONFLICT, "게임이 시작되지 않았습니다."),
    INVALID_THEME(HttpStatus.BAD_REQUEST, "지원하지 않는 테마예요."),
    INVALID_ROOM_NAME(HttpStatus.BAD_REQUEST, "방 이름은 1~20자로 입력해 주세요."),
    FORFEIT_NOT_ALLOWED_YET(HttpStatus.CONFLICT, "연결이 끊긴 지 60초가 지나야 기권 처리할 수 있습니다."),
    INVALID_CAPACITY(HttpStatus.BAD_REQUEST, "최대 인원은 2~5명 중에서 골라 주세요."),
    INVALID_ROOM_PASSWORD(HttpStatus.BAD_REQUEST, "방 비밀번호는 4~20자로 입력해 주세요."),
    CAPACITY_BELOW_PLAYERS(HttpStatus.CONFLICT, "지금 있는 인원보다 적게 줄일 수 없어요."),
    ROOM_PASSWORD_MISMATCH(HttpStatus.FORBIDDEN, "비밀번호가 맞지 않아요."),
    ROOM_PRIVATE(HttpStatus.FORBIDDEN, "비공개방은 관전할 수 없어요."),
    ROOM_NOT_PLAYING(HttpStatus.CONFLICT, "게임 중인 방만 관전할 수 있어요. 참가하기를 눌러 주세요."),
    NOT_SPECTATOR(HttpStatus.CONFLICT, "관전 중인 사람만 자리에 앉을 수 있어요."),
    SESSION_REPLACED(HttpStatus.UNAUTHORIZED, "다른 곳에서 로그인해서 로그아웃됐어요."),
    PLAYERS_NOT_READY(HttpStatus.CONFLICT, "모두 준비해야 시작할 수 있어요."),
    INVALID_CHAT_MESSAGE(HttpStatus.BAD_REQUEST, "메시지는 1~200자로 입력해 주세요."),
    CHAT_TOO_FAST(HttpStatus.TOO_MANY_REQUESTS, "메시지를 너무 빨리 보내고 있어요."),
    INVALID_PLAYER_TOTAL(HttpStatus.BAD_REQUEST, "인원 수는 0명 이상이어야 합니다."),

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
    CANNOT_CANCEL_DRAW(HttpStatus.CONFLICT, "덱에서 뽑은 카드는 되돌릴 수 없어요."),
    GAME_ALREADY_OVER(HttpStatus.CONFLICT, "이미 끝난 게임입니다."),
    UNO_INVALID_PLAYER_COUNT(HttpStatus.BAD_REQUEST, "우노는 2~5명이 플레이할 수 있습니다."),
    UNO_CARD_NOT_IN_HAND(HttpStatus.BAD_REQUEST, "내 손에 없는 카드예요."),
    UNO_CARD_NOT_PLAYABLE(HttpStatus.CONFLICT, "지금 낼 수 없는 카드예요."),
    UNO_ONLY_DRAWN_CARD(HttpStatus.CONFLICT, "방금 뽑은 카드만 낼 수 있어요."),
    UNO_COLOR_REQUIRED(HttpStatus.BAD_REQUEST, "와일드 카드는 색을 골라야 해요."),
    UNO_INVALID_COLOR(HttpStatus.BAD_REQUEST, "고를 수 없는 색이에요."),
    UNO_CALL_NOT_ALLOWED(HttpStatus.CONFLICT, "지금은 우노를 외칠 수 없어요."),
    UNO_CATCH_CLOSED(HttpStatus.CONFLICT, "지금은 우노를 잡을 수 없어요.");

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
