package com.boardgame.oldmaid;

import com.boardgame.common.error.BusinessException;
import com.boardgame.common.error.ErrorCode;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.Random;

// 한 판의 애그리거트. 차례 규칙은 모두 여기 있다.
public class OldMaidRound {

    private final OldMaidTable table;
    private final OldMaidPlayers players;
    private final TurnState turns;

    private OldMaidRound(OldMaidTable table, OldMaidPlayers players, TurnState turns) {
        this.table = table;
        this.players = players;
        this.turns = turns;
    }

    // R6~R9: 나눈 짝을 공개하고, 빈 손을 끝내고, 첫 차례를 정한다.
    static OldMaidRound begin(Seats seats, Deal deal, OldMaidDice dice, EventBatch batch) {
        OldMaidTable table = new OldMaidTable(deal.hands(), new DiscardPile(), dice);
        OldMaidPlayers players = new OldMaidPlayers(seats);
        PlayerId drawer = players.firstHolderFrom(deal.first(), table::holds);
        PlayerId target = players.nextHolder(drawer, table::holds);
        OldMaidRound round = new OldMaidRound(table, players, new TurnState(new Turn(drawer, target, TurnSeq.first())));
        batch.add(OldMaidEvent.start(drawer, target));
        deal.pairs().forEach((player, pairs) -> round.revealDealt(player, pairs, batch));
        players.inOrderFrom(deal.first()).forEach(player -> round.finishIfEmpty(player, batch));
        return round;
    }

    private void revealDealt(PlayerId player, List<CardPair> pairs, EventBatch batch) {
        table.discard(player, pairs);
        batch.add(OldMaidEvent.dealPairs(player, pairs));
    }

    // R8·R14·R26: 손패가 비었고 아직 등수가 없으면 다음 등수로 끝낸다.
    void finishIfEmpty(PlayerId player, EventBatch batch) {
        if (table.holds(player) || players.isOut(player)) {
            return;
        }
        batch.add(OldMaidEvent.finish(player, players.finish(player)));
    }

    // R12~R15: 상대의 index번 카드를 가져와 짝이면 버리고, 빈 사람을 끝내고(상대 먼저, D5), 차례를 넘긴다.
    void draw(PlayerId drawer, SlotIndex slot, EventBatch batch) {
        Turn turn = turns.requireDrawer(drawer);
        PlayingCard card = table.takeFrom(turn.target(), slot);
        batch.add(OldMaidEvent.draw(drawer, turn.target()));
        table.giveDrawn(drawer, card)
                .ifPresent(pair -> batch.add(OldMaidEvent.pair(drawer, pair)));
        finishIfEmpty(turn.target(), batch);
        finishIfEmpty(drawer, batch);
        advanceFrom(drawer);
    }

    // R17~R19: 뽑는 사람의 신호만, 상대 손패 범위 안(또는 "고르지 않음")일 때만 받는다.
    boolean peek(PlayerId player, Optional<SlotIndex> slot, Instant now) {
        Turn turn = turns.current();
        if (!turn.isDrawer(player) || !fits(turn.target(), slot)) {
            return false;
        }
        return turns.movePeek(slot, now);
    }

    private boolean fits(PlayerId target, Optional<SlotIndex> slot) {
        return slot.map(index -> index.value() < table.sizeOf(target))
                .orElse(true);
    }

    // R22~R24: 카드를 가진 사람이 내 차례가 아닐 때, 1초에 한 번.
    void shuffle(PlayerId player, Instant now, EventBatch batch) {
        if (!table.holds(player)) {
            throw new BusinessException(ErrorCode.OLD_MAID_SHUFFLE_NOT_ALLOWED);
        }
        turns.useShuffle(player, now);
        table.shuffle(player);
        batch.add(OldMaidEvent.shuffle(player));
    }

    // R25~R27: 손패를 다음 카드 가진 사람에게 넘기고(짝 버림·섞음), 비면 끝내고, 차례를 다시 정한다.
    void forfeit(PlayerId leaver, EventBatch batch) {
        if (!table.holds(leaver)) {
            throw new BusinessException(ErrorCode.NOT_A_PLAYER);
        }
        List<PlayingCard> cards = table.takeAll(leaver);
        players.forfeit(leaver);
        Optional<PlayerId> receiver = players.nextHolderIfAny(leaver, table::holds);
        batch.add(OldMaidEvent.forfeit(leaver, receiver.orElse(null), cards.size()));
        receiver.ifPresent(player -> handOver(player, cards, batch));
        reseat();
    }

    private void handOver(PlayerId receiver, List<PlayingCard> cards, EventBatch batch) {
        table.giveForfeited(receiver, cards)
                .forEach(pair -> batch.add(OldMaidEvent.pair(receiver, pair)));
        finishIfEmpty(receiver, batch);
    }

    // R27: 뽑는 사람이 카드를 갖고 있으면 상대만 다시 정하고, 아니면 그 자리 다음 사람에게 차례를 넘긴다.
    private void reseat() {
        if (table.holderCount() < 2) {
            return;
        }
        PlayerId drawer = turns.current().drawer();
        if (!table.holds(drawer)) {
            advanceFrom(drawer);
            return;
        }
        turns.retarget(players.nextHolder(drawer, table::holds));
    }

    // R35: 상대 손패에서 무작위 자리 1장을 대신 뽑는다. 대신 뽑은 사람을 돌려준다.
    PlayerId autoDraw(Random random, EventBatch batch) {
        Turn turn = turns.current();
        SlotIndex slot = new SlotIndex(random.nextInt(table.sizeOf(turn.target())));
        draw(turn.drawer(), slot, batch);
        return turn.drawer();
    }

    boolean canShuffle(PlayerId player) {
        return table.holds(player) && !turns.current().isDrawer(player);
    }

    Optional<SlotIndex> peekSlot() {
        return turns.peekSlot();
    }

    long peekSeq() {
        return turns.peekSeq();
    }

    // R15·R16: 카드 가진 사람이 2명 이상일 때만 from 다음 사람에게 차례를 넘긴다(아니면 게임이 끝난다).
    void advanceFrom(PlayerId from) {
        if (table.holderCount() < 2) {
            return;
        }
        PlayerId next = players.nextHolder(from, table::holds);
        turns.begin(next, players.nextHolder(next, table::holds));
    }

    // R30: 마지막까지 카드를 쥔 한 사람을 넣어 최종 등수를 만든다.
    Ranking ranking() {
        PlayerId lastHolder = players.firstHolderFrom(players.firstSeat(), table::holds);
        return players.rank(lastHolder);
    }

    PlayerId drawer() {
        return turns.current().drawer();
    }

    PlayerId target() {
        return turns.current().target();
    }

    TurnSeq turnSeq() {
        return turns.current().seq();
    }

    long holderCount() {
        return table.holderCount();
    }

    boolean holds(PlayerId player) {
        return table.holds(player);
    }

    boolean isParticipant(PlayerId player) {
        return players.isSeated(player) && !players.hasForfeited(player);
    }

    List<PlayingCard> handOf(PlayerId player) {
        return table.cardsOf(player);
    }

    int cardCount(PlayerId player) {
        return table.sizeOf(player);
    }

    Optional<FinishRank> finishRankOf(PlayerId player) {
        return players.rankOf(player);
    }

    boolean hasForfeited(PlayerId player) {
        return players.hasForfeited(player);
    }

    List<PlayerId> seats() {
        return players.seats();
    }

    int discardCount() {
        return table.discardCount();
    }

    List<CardPair> recentPairs(int limit) {
        return table.recentPairs(limit);
    }

    List<DiscardedPair> discards() {
        return table.discards();
    }
}
