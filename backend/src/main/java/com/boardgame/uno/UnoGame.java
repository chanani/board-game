package com.boardgame.uno;

import com.boardgame.common.error.BusinessException;
import com.boardgame.common.error.ErrorCode;
import com.boardgame.game.PendingActor;
import com.boardgame.uno.view.UnoView;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.function.Consumer;

// 한 게임(= 한 판). 행동은 Task 3~6이 더한다.
public class UnoGame {

    private static final int MIN_PLAYERS = 2;
    private static final int MAX_PLAYERS = 5;

    private final UnoRound round;
    private final UnoEvents events;
    private UnoResult result;

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

    public void challenge(PlayerId player) {
        run(player, batch -> round.challenge(player, batch));
    }

    public void accept(PlayerId player) {
        run(player, batch -> round.accept(player, batch));
    }

    public void callUno(PlayerId player) {
        run(player, batch -> round.callUno(player, batch));
    }

    public void catchUno(PlayerId catcher, PlayerId target) {
        run(catcher, batch -> round.catchUno(catcher, target, batch));
    }

    public boolean canCallUno(PlayerId viewer) {
        return round.canCallUno(viewer);
    }

    public boolean canCatch(PlayerId viewer) {
        return round.canCatch(viewer);
    }

    public Optional<FourCharge> pendingCharge() {
        return round.pendingCharge();
    }

    public Optional<ChallengeReveal> revealFor(PlayerId viewer) {
        return round.revealFor(viewer);
    }

    public void chooseColor(PlayerId player, ChosenColor color) {
        run(player, batch -> round.chooseColor(player, color, batch));
    }

    public void forfeit(PlayerId player) {
        run(player, batch -> round.forfeit(player, batch));
    }

    // 시간 초과: 지금 단계의 행동을 그 사람 대신 한다. 대신 행동한 사람을 돌려준다.
    public PlayerId autoAct() {
        requireInProgress();
        PlayerId actor = round.actor();
        apply(true, round::autoAct);
        return actor;
    }

    public boolean isFinished() {
        return result != null;
    }

    public Optional<UnoResult> result() {
        return Optional.ofNullable(result);
    }

    public UnoPoints pointsOf(PlayerId player) {
        return round.pointsOf(player);
    }

    // 사람이 한 행동: 끝난 게임이 아닌지, 남은 참가자인지 본 뒤 상태를 바꾼다.
    private void run(PlayerId player, Consumer<EventBatch> action) {
        requireInProgress();
        requirePlayer(player);
        apply(false, action);
    }

    // 이벤트를 모아 성공했을 때만 기록을 바꾼다.
    private void apply(boolean auto, Consumer<EventBatch> action) {
        EventBatch batch = events.open(auto);
        action.accept(batch);
        settle(batch);
        round.forgetRevealUnless(batch);
        events.commit(batch);
    }

    private void requireInProgress() {
        if (isFinished()) {
            throw new BusinessException(ErrorCode.GAME_ALREADY_OVER);
        }
    }

    // R29·R33: 손패를 비운 사람이 있거나 남은 사람이 1명이면 끝낸다. 끝나는 행동에서 딱 한 번만 정산된다.
    private void settle(EventBatch batch) {
        round.winnerByEmptyHand()
                .ifPresent(winner -> finish(UnoResult.emptyHand(winner, round.pointsExcept(winner)), batch));
        if (!isFinished() && round.remainingCount() == 1) {
            finish(UnoResult.forfeit(round.remaining().get(0)), batch);
        }
    }

    // R28: 끝나면 잡기 창도 닫는다.
    private void finish(UnoResult ended, EventBatch batch) {
        result = ended;
        round.closeCatch();
        batch.add(ended.toEvent());
    }

    private void requirePlayer(PlayerId player) {
        if (!round.isRemaining(player)) {
            throw new BusinessException(ErrorCode.NOT_A_PLAYER);
        }
    }

    // R18: 차례인 사람(TURN). 잡기 창이 열려 있으면 차례인 사람을 뺀 남은 사람 모두(REACTION: 잡기, 대상 본인은 늦은 외침).
    public List<PendingActor> pendingActors() {
        if (isFinished()) {
            return List.of();
        }
        PlayerId actor = round.actor();
        List<PendingActor> pending = new ArrayList<>();
        pending.add(PendingActor.turn(actor.value()));
        if (round.catchTarget().isPresent()) {
            pending.addAll(reactionsExcept(actor));
        }
        return List.copyOf(pending);
    }

    private List<PendingActor> reactionsExcept(PlayerId actor) {
        return round.remaining()
                .stream()
                .filter(player -> !player.equals(actor))
                .map(player -> PendingActor.reaction(player.value()))
                .toList();
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

    public List<CardId> playableFor(PlayerId viewer) {
        return round.playableFor(viewer);
    }

    public boolean isRiskyFour(PlayerId viewer) {
        return round.isRiskyFour(viewer);
    }

    public Optional<CardId> drawnFor(PlayerId viewer) {
        return round.drawnFor(viewer);
    }

    public UnoView viewFor(PlayerId viewer, UnoViewContext context) {
        return UnoViewAssembler.assemble(this, viewer, context);
    }
}
