package com.boardgame.uno.bot;

import com.boardgame.uno.CardKind;
import com.boardgame.uno.Direction;
import com.boardgame.uno.UnoColor;
import com.boardgame.uno.UnoEventReason;
import com.boardgame.uno.UnoEventType;
import com.boardgame.uno.UnoStage;
import com.boardgame.uno.UnoStatus;
import com.boardgame.uno.view.UnoCardView;
import com.boardgame.uno.view.UnoCatchView;
import com.boardgame.uno.view.UnoChallengeView;
import com.boardgame.uno.view.UnoEventView;
import com.boardgame.uno.view.UnoPlayerView;
import com.boardgame.uno.view.UnoSessionView;
import com.boardgame.uno.view.UnoView;
import java.util.ArrayList;
import java.util.List;

// 컴퓨터 시야 테스트용 화면 빌더. 기본: 나(-1)의 PLAY 차례, 빨강, 시계 방향, 상대 -2·-3은 7장씩.
final class UnoViews {

    static final long ME = -1L;
    static final long LEFT = -2L;
    static final long RIGHT = -3L;

    private static int nextId = 1;

    private UnoStage stage = UnoStage.PLAY;
    private Long current = ME;
    private Direction direction = Direction.CLOCKWISE;
    private UnoColor color = UnoColor.RED;
    private final List<UnoCardView> hand = new ArrayList<>();
    private final List<Integer> playable = new ArrayList<>();
    private int leftCards = 7;
    private int rightCards = 7;
    private boolean risky;
    private Integer drawn;
    private boolean canCall;
    private UnoCatchView unoCatch;
    private boolean canCatch;
    private UnoChallengeView challenge;
    private final List<UnoEventView> events = new ArrayList<>();

    static UnoViews view() {
        return new UnoViews();
    }

    static UnoCardView number(UnoColor color, int number) {
        return new UnoCardView(nextId++, CardKind.NUMBER, color, number);
    }

    static UnoCardView action(UnoColor color, CardKind kind) {
        return new UnoCardView(nextId++, kind, color, null);
    }

    static UnoCardView wild() {
        return new UnoCardView(nextId++, CardKind.WILD, null, null);
    }

    static UnoCardView four() {
        return new UnoCardView(nextId++, CardKind.WILD_DRAW_FOUR, null, null);
    }

    static UnoEventView event(long seq, UnoEventType type, Long actor, Long target, UnoCardView card) {
        return new UnoEventView(seq, type, actor, target, card, null, null, null, false);
    }

    static UnoEventView penalty(long seq, long target) {
        return new UnoEventView(seq, UnoEventType.PENALTY, null, target, null, null, 2, UnoEventReason.DRAW_TWO, false);
    }

    /** 낼 수 있는 카드로 손에 넣는다. */
    UnoViews playable(UnoCardView... cards) {
        for (UnoCardView card : cards) {
            hand.add(card);
            playable.add(card.id());
        }
        return this;
    }

    /** 낼 수 없는 카드로 손에 넣는다. */
    UnoViews held(UnoCardView... cards) {
        hand.addAll(List.of(cards));
        return this;
    }

    UnoViews stage(UnoStage stage) {
        this.stage = stage;
        return this;
    }

    UnoViews current(Long current) {
        this.current = current;
        return this;
    }

    UnoViews direction(Direction direction) {
        this.direction = direction;
        return this;
    }

    UnoViews color(UnoColor color) {
        this.color = color;
        return this;
    }

    UnoViews left(int cards) {
        this.leftCards = cards;
        return this;
    }

    UnoViews right(int cards) {
        this.rightCards = cards;
        return this;
    }

    UnoViews risky() {
        this.risky = true;
        return this;
    }

    /** DRAWN 단계: 방금 뽑은 낼 수 있는 카드. */
    UnoViews drawn(UnoCardView card) {
        this.stage = UnoStage.DRAWN;
        hand.add(card);
        playable.clear();
        playable.add(card.id());
        this.drawn = card.id();
        return this;
    }

    UnoViews canCall() {
        this.canCall = true;
        return this;
    }

    /** 잡기 창: target이 안 외치고 한 장. 대상이 내가 아니면 잡을 수 있다. */
    UnoViews catchWindow(long target) {
        this.unoCatch = new UnoCatchView(target);
        this.canCatch = target != ME;
        return this;
    }

    UnoViews challenge(long by, UnoColor previous) {
        this.stage = UnoStage.CHALLENGE;
        this.challenge = new UnoChallengeView(by, ME, previous);
        return this;
    }

    UnoViews events(UnoEventView... events) {
        this.events.addAll(List.of(events));
        return this;
    }

    UnoView game() {
        List<UnoPlayerView> seats = List.of(
                new UnoPlayerView(ME, hand.size(), false),
                new UnoPlayerView(LEFT, leftCards, false),
                new UnoPlayerView(RIGHT, rightCards, false));
        return new UnoView(ME, UnoStatus.IN_PROGRESS, 0L, stage, current, direction, color,
                number(color, 0), 1, 80, List.of(ME, LEFT, RIGHT), seats, List.copyOf(hand),
                List.copyOf(playable), risky, drawn, canCall, unoCatch, canCatch, challenge, null, null, null,
                null, 0L, List.of(), 0L, List.copyOf(events));
    }

    UnoSessionView session() {
        return new UnoSessionView(game());
    }

    UnoSight sight() {
        return new UnoSight(game());
    }
}
