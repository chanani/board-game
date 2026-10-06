package com.boardgame.uno;

import java.util.List;
import java.util.Optional;

// 한 판의 애그리거트. 모든 규칙 메서드가 여기에 있다(Task 3~6이 더한다).
public class UnoRound {

    static final int NEXT = 1;
    static final int SKIP_ONE = 2;
    private static final int DRAW_TWO_COUNT = 2;
    private static final int TWO_PLAYERS = 2;

    private final UnoTable table;
    private final UnoPlayers players;
    private final UnoProgress progress;

    UnoRound(UnoTable table, UnoPlayers players, UnoProgress progress) {
        this.table = table;
        this.players = players;
        this.progress = progress;
    }

    // R7: 첫 카드 효과를 적용하고, 효과 이벤트 뒤에 START(첫 차례 사람, 첫 카드)를 남긴다.
    void openWith(UnoCard first, EventBatch events) {
        switch (first.kind()) {
            case SKIP -> skipStarter(events);
            case REVERSE -> reverseAtStart(events);
            case DRAW_TWO -> drawTwoAtStart(events);
            case WILD -> progress.begin(Turn.chooseColor(players.current()));
            default -> progress.begin(Turn.play(players.current()));
        }
        events.add(UnoEvent.start(players.current(), first));
    }

    private void skipStarter(EventBatch events) {
        events.add(UnoEvent.skip(players.current()));
        passTurn(NEXT);
    }

    // 3명 이상이면 반대 방향으로 딜러(starter 바로 앞 사람)부터. 2명이면 starter가 차례를 잃는 것과 같다.
    private void reverseAtStart(EventBatch events) {
        if (players.size() == TWO_PLAYERS) {
            skipStarter(events);
            return;
        }
        players.reverse();
        events.add(UnoEvent.reverse(null));
        passTurn(NEXT);
    }

    private void drawTwoAtStart(EventBatch events) {
        penalize(players.current(), DRAW_TWO_COUNT, UnoEventReason.DRAW_TWO, events);
        passTurn(NEXT);
    }

    // 벌칙으로 뽑게 한다. 더미가 모자라면 실제로 뽑은 장수만 기록한다(R14).
    void penalize(PlayerId target, int count, UnoEventReason reason, EventBatch events) {
        List<UnoCard> drawn = table.draw(count, events);
        players.give(target, drawn);
        events.add(UnoEvent.penalty(target, drawn.size(), reason));
    }

    // 차례를 넘긴다. steps 1 = 다음 사람, 2 = 한 사람 건너뜀. 같은 사람이 다시 해도 새 단계(새 순번)다.
    void passTurn(int steps) {
        players.endTurn();
        players.advance(steps);
        progress.begin(Turn.play(players.current()));
    }

    public PlayerId actor() {
        return progress.actor();
    }

    public UnoStage stage() {
        return progress.stage();
    }

    public StageSeq stageSeq() {
        return progress.seq();
    }

    public Direction direction() {
        return players.direction();
    }

    public Optional<UnoColor> currentColor() {
        return table.color();
    }

    public UnoCard discardTop() {
        return table.top();
    }

    public int discardSize() {
        return table.discardSize();
    }

    public int drawPileSize() {
        return table.drawPileSize();
    }

    public List<UnoCard> handOf(PlayerId player) {
        return players.cardsOf(player);
    }

    public int cardCount(PlayerId player) {
        return players.countOf(player);
    }

    public List<PlayerId> remaining() {
        return players.seats();
    }

    public boolean isRemaining(PlayerId player) {
        return players.contains(player);
    }

    public boolean isDeclared(PlayerId player) {
        return players.isDeclared(player);
    }

    public Optional<PlayerId> catchTarget() {
        return players.catchTarget();
    }
}
