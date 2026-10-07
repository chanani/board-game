package com.boardgame.oldmaid;

import java.util.List;
import java.util.Optional;

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
        table.discard(pairs);
        batch.add(OldMaidEvent.dealPairs(player, pairs));
    }

    // R8·R14·R26: 손패가 비었고 아직 등수가 없으면 다음 등수로 끝낸다.
    void finishIfEmpty(PlayerId player, EventBatch batch) {
        if (table.holds(player) || players.isOut(player)) {
            return;
        }
        batch.add(OldMaidEvent.finish(player, players.finish(player)));
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
}
