package com.boardgame.uno;

// 상태 변화에서 생긴 일 하나. 화면으로 그대로 나가는 기록이라 필드 수 제한의 예외다(스펙 4.5, D18).
// 뽑은 카드 얼굴은 넣지 않는다(숨은 정보). seq와 auto는 UnoEvents.commit이 찍는다.
public record UnoEvent(long seq, UnoEventType type, PlayerId actor, PlayerId target, UnoCard card,
                       UnoColor color, Integer count, UnoEventReason reason, boolean auto) {

    private static UnoEvent draft(UnoEventType type, PlayerId actor, PlayerId target) {
        return new UnoEvent(0L, type, actor, target, null, null, null, null, false);
    }

    public static UnoEvent start(PlayerId firstActor, UnoCard firstCard) {
        return new UnoEvent(0L, UnoEventType.START, firstActor, null, firstCard, null, null, null, false);
    }

    public static UnoEvent firstCardRedrawn(UnoCard card) {
        return new UnoEvent(0L, UnoEventType.FIRST_CARD_REDRAWN, null, null, card, null, null, null, false);
    }

    /** chosen: 와일드일 때 고른 색, 아니면 null. */
    public static UnoEvent play(PlayerId actor, UnoCard card, UnoColor chosen) {
        return new UnoEvent(0L, UnoEventType.PLAY, actor, null, card, chosen, null, null, false);
    }

    public static UnoEvent color(PlayerId actor, UnoColor color) {
        return new UnoEvent(0L, UnoEventType.COLOR, actor, null, null, color, null, null, false);
    }

    public static UnoEvent draw(PlayerId actor) {
        return new UnoEvent(0L, UnoEventType.DRAW, actor, null, null, null, 1, null, false);
    }

    public static UnoEvent pass(PlayerId actor, UnoEventReason reason) {
        return new UnoEvent(0L, UnoEventType.PASS, actor, null, null, null, null, reason, false);
    }

    public static UnoEvent skip(PlayerId target) {
        return draft(UnoEventType.SKIP, null, target);
    }

    /** 첫 카드 REVERSE면 actor는 null. */
    public static UnoEvent reverse(PlayerId actor) {
        return draft(UnoEventType.REVERSE, actor, null);
    }

    public static UnoEvent penalty(PlayerId target, int count, UnoEventReason reason) {
        return new UnoEvent(0L, UnoEventType.PENALTY, null, target, null, null, count, reason, false);
    }

    public static UnoEvent challenge(PlayerId challenger, PlayerId charged, UnoEventReason verdict) {
        return new UnoEvent(0L, UnoEventType.CHALLENGE, challenger, charged, null, null, null, verdict, false);
    }

    public static UnoEvent unoCall(PlayerId actor) {
        return draft(UnoEventType.UNO_CALL, actor, null);
    }

    public static UnoEvent unoCaught(PlayerId catcher, PlayerId target) {
        return draft(UnoEventType.UNO_CAUGHT, catcher, target);
    }

    public static UnoEvent reshuffle(int newPileSize) {
        return new UnoEvent(0L, UnoEventType.RESHUFFLE, null, null, null, null, newPileSize, null, false);
    }

    /** points: 손패를 비워 끝났으면 얻은 점수, 기권으로 끝났으면 null. */
    public static UnoEvent gameEnd(PlayerId winner, Integer points, UnoEventReason reason) {
        return new UnoEvent(0L, UnoEventType.GAME_END, winner, null, null, null, points, reason, false);
    }

    public UnoEvent stamped(long newSeq, boolean byTimeout) {
        return new UnoEvent(newSeq, type, actor, target, card, color, count, reason, byTimeout);
    }
}
