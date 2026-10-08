package com.boardgame.room.domain;

import com.boardgame.common.error.BusinessException;
import com.boardgame.common.error.ErrorCode;
import com.boardgame.game.bot.BotDifficulty;
import com.boardgame.member.domain.Avatar;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.IntStream;
import java.util.stream.Stream;

public class RoomMembers {

    private final List<Participant> members = new ArrayList<>();
    private final ReadyMembers ready = new ReadyMembers();
    private final BotIds botIds = new BotIds();

    public void add(Participant participant, Capacity capacity) {
        if (contains(participant.memberId())) {
            return;
        }
        if (capacity.isFull(members.size())) {
            throw new BusinessException(ErrorCode.ROOM_FULL);
        }
        members.add(participant);
    }

    /** R2·R3: 다음 음수 번호와 가장 작은 빈 이름 번호로 컴퓨터를 앉힌다. */
    public Participant addBot(BotDifficulty difficulty, Avatar avatar, Capacity capacity) {
        BotProfile profile = new BotProfile(BotNumber.smallestFree(botNumbers()), difficulty, avatar);
        Participant bot = Participant.bot(botIds.next(), profile);
        add(bot, capacity);
        return bot;
    }

    /** R10: 앉아 있는 컴퓨터의 난이도만 바꾼다. 없거나 사람이면 BOT_NOT_FOUND. */
    public void changeBot(long botId, BotDifficulty difficulty) {
        int index = botIndexOf(botId);
        Participant bot = members.get(index);
        members.set(index, bot.withDifficulty(difficulty));
    }

    public void remove(long memberId) {
        boolean wasHost = isHost(memberId);
        members.removeIf(member -> member.memberId() == memberId);
        ready.unmark(memberId);
        if (wasHost) {
            ready.clear();
        }
    }

    public void setReady(long memberId, boolean value) {
        if (!value) {
            ready.unmark(memberId);
            return;
        }
        ready.mark(memberId);
    }

    // R5: 컴퓨터는 늘 준비된 것으로 본다. 사람 손님만 확인한다.
    public boolean everyGuestReady() {
        return ready.containsAll(guestIds());
    }

    public void clearReady() {
        ready.clear();
    }

    public List<Long> readyIds() {
        return ready.asList();
    }

    private List<Long> guestIds() {
        long hostId = hostId();
        return humans()
                .map(Participant::memberId)
                .filter(id -> id != hostId)
                .toList();
    }

    public boolean contains(long memberId) {
        return members.stream().anyMatch(member -> member.memberId() == memberId);
    }

    public void requireMember(long memberId) {
        if (!contains(memberId)) {
            throw new BusinessException(ErrorCode.NOT_IN_ROOM);
        }
    }

    // R12: 방장은 들어온 순서로 첫 사람이다(컴퓨터는 건너뛴다).
    public Participant host() {
        return humans()
                .findFirst()
                .orElseThrow(() -> new IllegalStateException("사람이 없는 방에는 방장이 없다"));
    }

    public long hostId() {
        return host().memberId();
    }

    public boolean isHost(long memberId) {
        return hasHumans() && hostId() == memberId;
    }

    public boolean hasHumans() {
        return humans().findAny().isPresent();
    }

    public boolean isEmpty() {
        return members.isEmpty();
    }

    public int size() {
        return members.size();
    }

    public List<Long> ids() {
        return members.stream().map(Participant::memberId).toList();
    }

    public List<Long> humanIds() {
        return humans()
                .map(Participant::memberId)
                .toList();
    }

    public List<Participant> bots() {
        return members.stream()
                .filter(Participant::isBot)
                .toList();
    }

    public boolean isBot(long memberId) {
        return bots().stream().anyMatch(bot -> bot.memberId() == memberId);
    }

    public List<Participant> asList() {
        return List.copyOf(members);
    }

    private Stream<Participant> humans() {
        return members.stream().filter(Participant::isHuman);
    }

    private List<BotNumber> botNumbers() {
        return bots().stream()
                .map(Participant::bot)
                .map(BotProfile::number)
                .toList();
    }

    private int botIndexOf(long botId) {
        return IntStream.range(0, members.size())
                .filter(index -> isBotAt(index, botId))
                .findFirst()
                .orElseThrow(() -> new BusinessException(ErrorCode.BOT_NOT_FOUND));
    }

    private boolean isBotAt(int index, long botId) {
        Participant member = members.get(index);
        return member.memberId() == botId && member.isBot();
    }
}
