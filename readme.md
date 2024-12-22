# MemorySwapFileManager
MemorySwapFileManagerは、メモリの状況を監視し、スワップファイルを自動的に調整するプログラムです。メモリの使用状況に応じてスワップファイルを作成、削除、有効化、無効化します。

ディスクスペースに余裕を持たせることのできるプログラムです。予め大容量のスワップ領域を割り当てたりする必要はもうありません。

## 仕様
大まかな仕様は以下です。
- スワップフォルダ: `/swapFolder`
- スワップファイルのサイズ: 1GB
- スワップファイルの作成条件: スワップの空き容量が500MB未満の場合
- スワップファイルの削除条件: スワップの空き容量が2GB以上の場合
- 不正なスワップファイルの条件: サイズが800MB未満または1.2GB以上のファイル、スワップフォルダ直下以外にあるスワップファイル

## 注意事項
- このプログラムはスーパーユーザー権限が必要です。実行する際には`sudo`を使用してください。
- 現在のプログラムはルートディレクトリに全てのスワップファイルがある前提で動作をします。バグが起こる可能性があるので注意してください。
- 初回起動時は、元から存在するスワップファイルを移動したり、削除したりします。その時にディスク領域を占領する可能性があるので、注意してください。２度目からはその影響はなくなります。

## 使い方
このプログラムを利用する方法を解説します。

### インストール
1. このリポジトリをクローンします。
    ```sh
    git clone https://github.com/yourusername/memorySwapFileManager.git
    ```
2. 必要な依存関係をインストールします。
    ```sh
    cd memorySwapFileManager
    npm install
    ```

### 使い方
1. tscコマンドでTypeScriptファイルをコンパイルします。
    ```sh
    tsc
    ```

2. プログラムを実行します。
    ```sh
    sudo node main
    ```

3. プログラムは自動的にメモリの状況を監視し、スワップファイルを調整します。

## ライセンス
このプロジェクトはMITライセンスの下で公開されています。詳細はLICENSEファイルを参照してください。