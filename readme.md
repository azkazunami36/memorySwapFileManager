# MemorySwapFileManager
MemorySwapFileManagerは、Ubuntu OSのメモリの状況を監視し、スワップファイルを自動的に調整するプログラムです。メモリの使用状況に応じてスワップファイルを作成、削除、有効化、無効化します。

ディスクスペースに余裕を持たせることのできるプログラムです。予め大容量のスワップ領域を割り当てたりする必要はもうありません。

## 仕様
大まかな仕様は以下です。
- スワップフォルダ: `/swapFolder`
- スワップファイルのサイズ: 1GB
- スワップファイルの作成条件: スワップの空き容量が500MB未満の場合
- スワップファイルの削除条件: スワップの空き容量が2GB以上の場合
- 不正なスワップファイルの条件: サイズが800MB未満または1.2GB以上のファイル、スワップフォルダ直下以外にあるスワップファイル

## 注意事項
- Ubuntuでのみ動作を検証しています。その他のLinux OSでは動作を確認していません。
- 個人利用で、危険性を理解した上で利用することを推奨しています。
- macOS、Windowsでは実行できません。エラーが発生します。
- このプログラムをインストールするにはスーパーユーザー権限が必要です。実行する際には`sudo`を使用してください。
- 現在のプログラムはルートディレクトリに全てのスワップファイルがある前提で動作をします。バグが起こる可能性があるので注意してください。
- 初回起動時は、元から存在するスワップファイルを移動したり、削除したりします。その時にディスク領域を占領する可能性があるので、注意してください。２度目からはその影響はなくなります。
- 安定して動作するとは限りません。`systemctl status memorySwapFilemanager`で状況をチェックすることをおすすめします。

## 使い方
このプログラムを利用する方法を解説します。

### インストール
1. このリポジトリをクローンします。
    ```sh
    git clone https://github.com/azkazunami36/memorySwapFileManager.git
    ```
2. 必要な依存関係をインストールします(インストールも行われます)。実行の際はsudo・root権限を利用してください。
    ```sh
    cd memorySwapFileManager
    sudo npm install
    ```
3. プログラムは自動的にメモリの状況を監視し、スワップファイルを調整します。

### systemdを使わずに利用する
このプログラムはsystemctlコマンドが利用できる環境である場合、`npm i`で依存関係をインストールしたあとにsystemdにサービスを自動的に登録し、自動的に起動します。ただ、直接起動する手段を取ることも可能です。

通常、インストール後はsystemdにサービスが登録された状態になっています。サービスを無効化し、サービスファイルを削除する必要があります。以下のコードを実行してください。
```
sudo systemctl disable memorySwapFilemanager
sudo systemctl stop memorySwapFilemanager
```
上記のコマンドを実行すると、サービスの停止・次回以降の起動の抑制ができます。もしサービスを削除したい場合は
```
sudo systemctl disable memorySwapFilemanager
sudo systemctl stop memorySwapFilemanager
sudo rm -r /etc/systemd/system/memorySwapFilemanager.service
```
を実行してください。

次に、起動方法です。このリポジトリ内で
```
sudo node main.js
```
を実行するだけです。もしJSファイルがない場合は`npx tsc`を実行すると、JSファイルを作成できます。

## ライセンス
このプロジェクトはMITライセンスの下で公開されています。詳細はLICENSEファイルを参照してください。
