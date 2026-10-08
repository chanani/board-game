package com.boardgame.uno.bot;

import com.boardgame.uno.UnoColor;
import com.boardgame.uno.UnoStage;
import com.boardgame.uno.view.UnoCardView;
import com.boardgame.uno.view.UnoCatchView;
import com.boardgame.uno.view.UnoChallengeView;
import com.boardgame.uno.view.UnoEventView;
import com.boardgame.uno.view.UnoPlayerView;
import com.boardgame.uno.view.UnoSessionView;
import com.boardgame.uno.view.UnoView;
import java.util.Arrays;
import java.util.List;
import java.util.Objects;
import java.util.Optional;

// R16: 컴퓨터의 시야 = 그 자리 사람이 받는 화면(UnoView) 그대로. 남의 손패·뽑을 더미·+4 합법 여부는 여기에 없다.
public record UnoSight(UnoView game) {

    public static UnoSight of(Object view) {
        return new UnoSight(((UnoSessionView) view).game());
    }

    public long me() {
        return game.viewerId();
    }

    public boolean myTurn() {
        return Objects.equals(game.currentPlayerId(), game.viewerId());
    }

    public UnoStage stage() {
        return game.stage();
    }

    public List<UnoCardView> hand() {
        return Optional.ofNullable(game.hand())
                .orElse(List.of());
    }

    /** 손패 중 지금 낼 수 있는 카드(손패 순서). */
    public List<UnoCardView> playable() {
        List<Integer> ids = game.playableCardIds();
        return hand().stream()
                .filter(card -> ids.contains(card.id()))
                .toList();
    }

    /** 지금 +4를 내면 허세(현재 색 카드를 가짐)인지. */
    public boolean riskyFour() {
        return game.wildDrawFourRisky();
    }

    public Optional<UnoCardView> drawn() {
        Integer drawnId = game.drawnCardId();
        return hand().stream()
                .filter(card -> drawnId != null && card.id() == drawnId)
                .findFirst();
    }

    public boolean canCall() {
        return game.canCallUno();
    }

    public boolean canCatch() {
        return game.canCatch();
    }

    public Optional<Long> catchTarget() {
        return Optional.ofNullable(game.unoCatch())
                .map(UnoCatchView::playerId);
    }

    public Optional<UnoChallengeView> challenge() {
        return Optional.ofNullable(game.challenge());
    }

    public Optional<UnoColor> currentColor() {
        return Optional.ofNullable(game.currentColor());
    }

    public List<UnoEventView> events() {
        return Optional.ofNullable(game.events())
                .orElse(List.of());
    }

    public int cardCountOf(long playerId) {
        return game.players()
                .stream()
                .filter(player -> player.playerId() == playerId)
                .mapToInt(UnoPlayerView::cardCount)
                .findFirst()
                .orElse(0);
    }

    /** 차례 방향으로 내 다음 사람의 카드 수(남은 사람, 자리 순). */
    public int nextPlayerCards() {
        List<UnoPlayerView> players = game.players();
        int size = players.size();
        int next = Math.floorMod(myIndex(players) + game.direction().step(), size);
        return players.get(next).cardCount();
    }

    private int myIndex(List<UnoPlayerView> players) {
        List<Long> ids = players.stream()
                .map(UnoPlayerView::playerId)
                .toList();
        return Math.max(0, ids.indexOf(me()));
    }

    /** except 카드를 뺀 손패에서 그 색 카드 수. */
    public int countOfColorExcept(UnoColor color, UnoCardView except) {
        return (int) hand().stream()
                .filter(card -> card.id() != except.id())
                .filter(card -> card.color() == color)
                .count();
    }

    /** except 카드를 뺀 손패에서 가장 많은 색. 동점은 enum 순서(RED 먼저) = 자동 색 고르기(R40). */
    public UnoColor mostHeldColorExcept(UnoCardView except) {
        return Arrays.stream(UnoColor.values())
                .reduce((best, color) -> moreThan(color, best, except))
                .orElseThrow();
    }

    private UnoColor moreThan(UnoColor color, UnoColor best, UnoCardView except) {
        if (countOfColorExcept(color, except) > countOfColorExcept(best, except)) {
            return color;
        }
        return best;
    }

    /** 손패에서 가장 많은 색. */
    public UnoColor mostHeldColor() {
        return mostHeldColorExcept(new UnoCardView(-1, null, null, null));
    }
}
