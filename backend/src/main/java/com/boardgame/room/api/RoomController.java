package com.boardgame.room.api;

import com.boardgame.common.security.LoginMember;
import com.boardgame.game.GameType;
import com.boardgame.room.application.RoomService;
import java.net.URI;
import java.util.List;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/rooms")
public class RoomController {

    private final RoomService roomService;

    public RoomController(RoomService roomService) {
        this.roomService = roomService;
    }

    @PostMapping
    public ResponseEntity<RoomResponse> create(@AuthenticationPrincipal LoginMember member,
                                               @RequestBody CreateRoomRequest request) {
        RoomResponse room = roomService.create(member, request);
        return ResponseEntity.created(URI.create("/api/rooms/" + room.code())).body(room);
    }

    @GetMapping
    public List<RoomSummaryResponse> rooms(@RequestParam(required = false) GameType gameType) {
        return roomService.rooms(gameType);
    }

    @GetMapping("/me")
    public ResponseEntity<RoomResponse> myRoom(@AuthenticationPrincipal LoginMember member) {
        return roomService.myRoom(member.id())
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.noContent().build());
    }

    @GetMapping("/{code}")
    public RoomResponse get(@PathVariable String code, @AuthenticationPrincipal LoginMember member) {
        return roomService.get(code, member.id());
    }

    @PostMapping("/{code}/watch")
    public RoomResponse watch(@PathVariable String code, @AuthenticationPrincipal LoginMember member) {
        return roomService.watch(code, member);
    }

    @PostMapping("/{code}/seat")
    public RoomResponse seat(@PathVariable String code, @AuthenticationPrincipal LoginMember member) {
        return roomService.seat(code, member.id());
    }

    @PostMapping("/{code}/join")
    public RoomResponse join(@PathVariable String code, @AuthenticationPrincipal LoginMember member,
                             @RequestBody(required = false) JoinRoomRequest request) {
        return roomService.join(code, member, passwordOf(request));
    }

    private String passwordOf(JoinRoomRequest request) {
        if (request == null) {
            return null;
        }
        return request.password();
    }

    @PostMapping("/{code}/leave")
    public ResponseEntity<Void> leave(@PathVariable String code, @AuthenticationPrincipal LoginMember member) {
        roomService.leave(code, member.id());
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{code}/ready")
    public RoomResponse ready(@PathVariable String code, @AuthenticationPrincipal LoginMember member,
                              @RequestBody ReadyRequest request) {
        return roomService.setReady(code, member.id(), request.ready());
    }

    @PostMapping("/{code}/start")
    public RoomResponse start(@PathVariable String code, @AuthenticationPrincipal LoginMember member) {
        return roomService.start(code, member.id());
    }

    @PostMapping("/{code}/members/{memberId}/forfeit")
    public ResponseEntity<Void> forfeit(@PathVariable String code, @PathVariable long memberId,
                                        @AuthenticationPrincipal LoginMember member) {
        roomService.forfeitDisconnected(code, member.id(), memberId);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{code}/members/{memberId}/kick")
    public ResponseEntity<Void> kick(@PathVariable String code, @PathVariable long memberId,
                                     @AuthenticationPrincipal LoginMember member) {
        roomService.kick(code, member.id(), memberId);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{code}/bots")
    public RoomResponse addBot(@PathVariable String code, @AuthenticationPrincipal LoginMember member,
                               @RequestBody(required = false) BotDifficultyRequest request) {
        return roomService.addBot(code, member.id(), request);
    }

    @PatchMapping("/{code}/bots/{botId}")
    public RoomResponse changeBot(@PathVariable String code, @PathVariable long botId,
                                  @AuthenticationPrincipal LoginMember member,
                                  @RequestBody(required = false) BotDifficultyRequest request) {
        return roomService.changeBot(code, member.id(), botId, request);
    }

    @PatchMapping("/{code}/settings")
    public RoomResponse settings(@PathVariable String code, @AuthenticationPrincipal LoginMember member,
                                 @RequestBody UpdateRoomSettingsRequest request) {
        return roomService.reconfigure(code, member.id(), request);
    }
}
