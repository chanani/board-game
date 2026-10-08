package com.boardgame.uno;

import static com.boardgame.uno.UnoColor.BLUE;
import static com.boardgame.uno.UnoColor.GREEN;
import static com.boardgame.uno.UnoColor.RED;
import static com.boardgame.uno.UnoFixtures.drawTwo;
import static com.boardgame.uno.UnoFixtures.filler;
import static com.boardgame.uno.UnoFixtures.num;
import static com.boardgame.uno.UnoFixtures.wild;
import static com.boardgame.uno.UnoFixtures.wildFour;
import static org.assertj.core.api.Assertions.assertThat;

import com.boardgame.game.GameAction;
import com.boardgame.support.MutableClock;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.Instant;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;
import org.junit.jupiter.api.Test;

class UnoViewTest {

    private static final long A = 1L;
    private static final long B = 2L;
    private static final long C = 3L;
    private static final long WATCHER = 99L;
    private static final List<UnoCard> A_HAND = List.of(wildFour(0), num(RED, 2), num(GREEN, 1), num(BLUE, 1));

    private final ObjectMapper mapper = new ObjectMapper();
    private final MutableClock clock = new MutableClock(Instant.parse("2026-10-07T00:00:00Z"));

    private UnoSession session(List<Long> ids, List<List<UnoCard>> hands, List<UnoCard> pile) {
        return new UnoSession(ids, UnoFixtures.factory(hands, num(RED, 5), pile, 0), clock);
    }

    private UnoSession threePlayers(List<UnoCard> pile) {
        return session(List.of(A, B, C), List.of(A_HAND,
                List.of(num(GREEN, 2), num(GREEN, 3), num(BLUE, 8), num(BLUE, 7)),
                List.of(num(GREEN, 4), num(GREEN, 6), num(BLUE, 9), num(BLUE, 6))), pile);
    }

    private JsonNode json(UnoSession session, long viewer) {
        return mapper.valueToTree(session.viewFor(viewer));
    }

    private static Set<String> fieldNames(JsonNode node) {
        Set<String> names = new HashSet<>();
        node.fieldNames().forEachRemaining(names::add);
        return names;
    }

    // JSON 트리 어디에 있든 카드 객체(kind와 id를 가진 객체)의 id를 모두 모은다.
    private static Set<Integer> cardIdsIn(JsonNode node) {
        Set<Integer> ids = new HashSet<>();
        collect(node, ids);
        return ids;
    }

    private static void collect(JsonNode node, Set<Integer> ids) {
        if (node.isObject() && node.has("kind") && node.has("id")) {
            ids.add(node.get("id").asInt());
        }
        node.forEach(child -> collect(child, ids));
    }

    private static Set<Integer> idsOf(List<UnoCard> cards) {
        return cards.stream().map(card -> card.id().value()).collect(Collectors.toSet());
    }

    private static GameAction action(String type) {
        return new GameAction(type, null, null);
    }

    @Test
    void 세션_화면은_gameType이_UNO이고_스펙의_칸을_모두_가진다() {
        JsonNode json = json(threePlayers(filler(10)), A);

        assertThat(json.get("gameType").asText()).isEqualTo("UNO");
        assertThat(fieldNames(json.get("game"))).containsExactlyInAnyOrder(
                "viewerId", "status", "startedAt", "stage", "currentPlayerId", "direction", "currentColor", "discardTop",
                "discardCount", "drawPileCount", "participantIds", "players", "hand", "playableCardIds",
                "drawnCardId", "canCallUno", "unoCatch", "canCatch", "result", "winnerId", "deadline",
                "serverNow", "lastAutoActorIds", "autoActSeq", "events");
        assertThat(fieldNames(json.at("/game/discardTop"))).containsExactlyInAnyOrder("id", "kind", "color", "number");
        assertThat(fieldNames(json.at("/game/players/0"))).containsExactlyInAnyOrder("playerId", "cardCount", "unoDeclared");
        assertThat(fieldNames(json.at("/game/events/0"))).containsExactlyInAnyOrder(
                "seq", "type", "actorId", "targetId", "card", "color", "count", "reason", "auto");
        assertThat(json.at("/game/status").asText()).isEqualTo("IN_PROGRESS");
        assertThat(json.at("/game/direction").asText()).isEqualTo("CLOCKWISE");
        assertThat(json.at("/game/participantIds").toString()).isEqualTo("[1,2,3]");
    }

    @Test
    void R22_남의_손패와_뽑은_카드는_JSON에_없다() {
        List<UnoCard> pile = new ArrayList<>(List.of(num(RED, 9)));
        pile.addAll(filler(10));
        UnoSession drawing = threePlayers(pile);
        drawing.act(A, action("DRAW"));

        JsonNode mine = json(drawing, A);
        JsonNode theirs = json(drawing, B);
        JsonNode watcher = json(drawing, WATCHER);

        assertThat(mine.at("/game/drawnCardId").asInt()).isEqualTo(num(RED, 9).id().value());
        assertThat(theirs.at("/game/drawnCardId").isNull()).isTrue();
        assertThat(theirs.at("/game/playableCardIds").size()).isZero();
        assertThat(theirs.at("/game/hand").size()).isEqualTo(4);
        Set<Integer> aHand = new HashSet<>(idsOf(A_HAND));
        aHand.add(num(RED, 9).id().value());
        assertThat(cardIdsIn(theirs)).doesNotContainAnyElementsOf(aHand);
        assertThat(cardIdsIn(watcher)).doesNotContainAnyElementsOf(aHand);
        theirs.at("/game/players").forEach(player -> assertThat(fieldNames(player)).containsExactlyInAnyOrder("playerId", "cardCount", "unoDeclared"));
    }

    @Test
    void 관전자는_손패가_없고_행동할_수_없다() {
        JsonNode watcher = json(threePlayers(filler(10)), WATCHER);

        assertThat(watcher.at("/game/viewerId").asLong()).isEqualTo(WATCHER);
        assertThat(watcher.at("/game/hand").isNull()).isTrue();
        assertThat(watcher.at("/game/playableCardIds").size()).isZero();
        assertThat(watcher.at("/game/canCallUno").asBoolean()).isFalse();
        assertThat(watcher.at("/game/canCatch").asBoolean()).isFalse();
    }

    @Test
    void 내_차례에는_낼_수_있는_카드를_알려_준다() {
        JsonNode mine = json(threePlayers(filler(10)), A);

        List<Integer> playable = new ArrayList<>();
        mine.at("/game/playableCardIds").forEach(id -> playable.add(id.asInt()));
        assertThat(playable).containsExactlyInAnyOrder(wildFour(0).id().value(), num(RED, 2).id().value());
        assertThat(mine.at("/game/hand").size()).isEqualTo(4);
    }

    @Test
    void 잡기_창은_모두에게_보이고_잡을_수_있는_사람만_canCatch다() {
        UnoSession session = session(List.of(A, B, C), List.of(
                List.of(num(RED, 1), num(RED, 2)), List.of(num(RED, 3), num(BLUE, 8)), List.of(num(RED, 4), num(BLUE, 9))), filler(10));
        session.act(A, new GameAction("PLAY", null, null, num(RED, 1).id().value(), null, null));

        assertThat(json(session, B).at("/game/unoCatch/playerId").asLong()).isEqualTo(A);
        assertThat(json(session, B).at("/game/canCatch").asBoolean()).isTrue();
        assertThat(json(session, A).at("/game/canCatch").asBoolean()).isFalse();
        assertThat(json(session, A).at("/game/canCallUno").asBoolean()).isTrue();
        assertThat(json(session, WATCHER).at("/game/unoCatch/playerId").asLong()).isEqualTo(A);
        assertThat(json(session, WATCHER).at("/game/canCatch").asBoolean()).isFalse();
    }

    @Test
    void 끝나면_남은_손패를_모두에게_공개한다() {
        UnoSession session = session(List.of(A, B, C), List.of(
                List.of(num(RED, 1), num(RED, 2)), List.of(num(BLUE, 9), wild(0)), List.of(num(GREEN, 3), drawTwo(BLUE))), filler(10));
        session.act(A, new GameAction("PLAY", null, null, num(RED, 1).id().value(), null, null));
        session.act(B, action("DRAW"));
        session.act(C, action("DRAW"));
        session.act(C, action("KEEP"));
        session.act(A, new GameAction("PLAY", null, null, num(RED, 2).id().value(), null, null));

        JsonNode json = json(session, B);

        assertThat(json.at("/game/status").asText()).isEqualTo("GAME_OVER");
        assertThat(json.at("/game/stage").isNull()).isTrue();
        assertThat(json.at("/game/currentPlayerId").isNull()).isTrue();
        assertThat(json.at("/game/deadline").isNull()).isTrue();
        assertThat(json.at("/game/winnerId").asLong()).isEqualTo(A);
        assertThat(json.at("/game/unoCatch").isNull()).isTrue();
        assertThat(json.at("/game/result/reason").asText()).isEqualTo("EMPTY_HAND");
        assertThat(json.at("/game/result/winnerId").asLong()).isEqualTo(A);
        assertThat(json.at("/game/result/points").asInt()).isEqualTo(83);
        assertThat(json.at("/game/result/players/0/playerId").asLong()).isEqualTo(B);
        assertThat(json.at("/game/result/players/0/points").asInt()).isEqualTo(59);
        assertThat(json.at("/game/result/players/1/playerId").asLong()).isEqualTo(C);
        assertThat(json.at("/game/result/players/1/cards").size()).isEqualTo(3);
        assertThat(json.at("/game/result/players/1/points").asInt()).isEqualTo(24);
    }

    @Test
    void 기권으로_끝나면_result는_FORFEIT이고_점수와_목록이_비어_있다() {
        UnoSession session = session(List.of(A, B), List.of(List.of(num(RED, 1)), List.of(num(GREEN, 1))), filler(5));
        session.forfeit(B);

        JsonNode json = json(session, A);

        assertThat(json.at("/game/result/reason").asText()).isEqualTo("FORFEIT");
        assertThat(json.at("/game/result/points").asInt()).isZero();
        assertThat(json.at("/game/result/players").size()).isZero();
        assertThat(json.at("/game/participantIds").toString()).isEqualTo("[1,2]");
        assertThat(json.at("/game/players").size()).isEqualTo(1);
    }

    @Test
    void 이벤트_seq는_게임_안에서_계속_오른다() {
        UnoSession session = threePlayers(filler(10));
        assertThat(json(session, A).at("/game/events/0/seq").asLong()).isEqualTo(1L);
        assertThat(json(session, A).at("/game/events/0/type").asText()).isEqualTo("START");

        session.act(A, new GameAction("PLAY", null, null, num(RED, 2).id().value(), null, null));
        assertThat(json(session, A).at("/game/events/0/seq").asLong()).isEqualTo(2L);

        session.act(B, action("DRAW"));
        JsonNode events = json(session, A).at("/game/events");
        assertThat(events.get(0).get("seq").asLong()).isEqualTo(3L);
        assertThat(events.get(0).get("type").asText()).isEqualTo("DRAW");
        assertThat(events.get(0).get("card").isNull()).isTrue();
        assertThat(events.get(1).get("seq").asLong()).isEqualTo(4L);
    }
}
