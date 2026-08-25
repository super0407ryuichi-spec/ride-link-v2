# Ride Link Ver.2 — Phase 1

iPhone Safariを最優先にした、バイクツーリング幹事向け軽量Webアプリのホーム画面です。

## 技術構成

- HTML5
- CSS3（レスポンシブ、安全領域対応）
- Vanilla JavaScript
- 外部ライブラリ、外部API、有料サービスなし

## 実行方法

最も簡単な確認方法は `index.html` をブラウザで開くことです。

ローカルサーバーを利用できる場合は、このフォルダを配信し、表示されたURLへSafariからアクセスしてください。例：

```sh
python -m http.server 8080
```

その後、`http://localhost:8080` を開きます。

## Phase 1の範囲

地図、雨雲、現在地、方位は画面構成確認用のデモ表示です。気象庁データ、位置情報、端末方位、Googleマップなどの外部連携は未実装です。
