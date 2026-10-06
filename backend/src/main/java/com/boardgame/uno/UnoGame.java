package com.boardgame.uno;

import com.boardgame.common.error.BusinessException;
import com.boardgame.common.error.ErrorCode;
import java.util.List;
import java.util.Optional;
import java.util.function.Consumer;

// 한 게임(= 한 판). 행동은 Task 3~6이 더한다.
public class UnoGame {

    private static final int MIN_PLAYERS = 2;
    private static final int MAX_PLAYERS = 5;

    private final UnoRound round;
    private final UnoEvents events;

    private UnoGame(UnoRound round, UnoEvents events) {
        this.round = round;
        this.events = events;
    }

    public static UnoGame start(List<PlayerId> players, UnoRoundFactory factory) {
        requirePlayerCount(players);
        UnoEvents events = new UnoEvents();
        EventBatch batch = events.open(false);
        UnoRound round = factory.create(players, batch);
        events.commit(batch);
        return new UnoGame(round, events);
    }

    private static void requirePlayerCount(List<PlayerId> players) {
        if (players.size() < MIN_PLAYERS || players.size() > MAX_PLAYERS) {
            throw new BusinessException(ErrorCode.UNO_INVALID_PLAYER_COUNT);
        }
    }

    public void play(PlayerId player, CardId card, ChosenColor color) {
        run(player, batch -> round.play(player, card, color, batch));
    }

    public void draw(PlayerId player) {
        run(player, batch -> round.draw(player, batch));
    }

    public void keep(PlayerId player) {
        run(player, batch -> round.keep(player, batch));
    }

    // 사람이 한 행동: 남은 참가자인지 본 뒤 상태를 바꾼다. (Task 6이 맨 앞에 게임 끝 검사를 더한다.)
    private void run(PlayerId player, Consumer<EventBatch> action) {
        requirePlayer(player);
        apply(false, action);
    }

    // 이벤트를 모아 성공했을 때만 기록을 바꾼다. (Task 4가 도전 공개 지우기, Task 6이 게임 끝 정산을 더한다.)
    private void apply(boolean auto, Consumer<EventBatch> action) {
        EventBatch batch = events.open(auto);
        action.accept(batch);
        events.commit(batch);
    }

    private void requirePlayer(PlayerId player) {
        if (!round.isRemaining(player)) {
            throw new BusinessException(ErrorCode.NOT_A_PLAYER);
        }
    }

    public PlayerId actor() {
        return round.actor();
    }

    public UnoStage stage() {
        return round.stage();
    }

    public StageSeq stageSeq() {
        return round.stageSeq();
    }

    public Direction direction() {
        return round.direction();
    }

    public Optional<UnoColor> currentColor() {
        return round.currentColor();
    }

    public UnoCard discardTop() {
        return round.discardTop();
    }

    public int discardSize() {
        return round.discardSize();
    }

    public int drawPileSize() {
        return round.drawPileSize();
    }

    public List<UnoCard> handOf(PlayerId player) {
        return round.handOf(player);
    }

    public int cardCount(PlayerId player) {
        return round.cardCount(player);
    }

    public List<PlayerId> remaining() {
        return round.remaining();
    }

    public boolean isRemaining(PlayerId player) {
        return round.isRemaining(player);
    }

    public boolean isDeclared(PlayerId player) {
        return round.isDeclared(player);
    }

    public Optional<PlayerId> catchTarget() {
        return round.catchTarget();
    }

    public List<UnoEvent> latestEvents() {
        return events.latest();
    }
}
