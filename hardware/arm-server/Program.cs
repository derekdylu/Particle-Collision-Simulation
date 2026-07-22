using System;
using System.IO;
using System.Net;
using System.Net.Sockets;
using Syntec.Remote;
using Syntec.OpenCNC;
using static Syntec.OpenCNC.CMMICore;

class Program
{
    public static SyntecRemoteCNC cnc = new SyntecRemoteCNC("192.168.0.99");

    static void Main()
    {
        Console.WriteLine("CNC 控制伺服器啟動中...");

        // 嘗試與 CNC 建立連線
        try
        {
            Read(); // 啟動時讀取狀態
        }
        catch (Exception ex)
        {
            Console.WriteLine("⚠ 與 CNC 建立連線時發生錯誤：" + ex.Message);
        }

        // 啟動 TCP 伺服器
        const int port = 12345;
        var listener = new TcpListener(IPAddress.Loopback, port);
        listener.Start();
        Console.WriteLine($"TCP 伺服器已啟動，監聽埠號 {port}...");
        while (true)
        {
            Console.WriteLine("等待 TCP 連線...");
            using (var client = listener.AcceptTcpClient())
            {
                Console.WriteLine("TCP 已連線！");
                using (var stream = client.GetStream())
                using (var reader = new StreamReader(stream))
                using (var writer = new StreamWriter(stream) { AutoFlush = true })
                {
                    string input;
                    while ((input = reader.ReadLine()) != null) // 連線持續中
                    {
                        Console.WriteLine("收到訊息：" + input);

                        if (input.ToLower() == "exit")
                        {
                            writer.WriteLine("伺服器結束連線...");
                            break; // 中止與 client 的這次連線
                        }
                        else if (input.ToLower() == "ping")
                        {
                            writer.WriteLine("ping");
                            writer.WriteLine("<END>");
                        }
                        else if (input.ToLower() == "read")
                        {
                            Read();
                            writer.WriteLine("讀取 CNC 狀態完成");
                            writer.WriteLine("<END>");
                        }
                        else if (input.ToLower() == "rateup")
                        {
                            RateUp();
                            writer.WriteLine("rate up");
                            writer.WriteLine("<END>");
                        }
                        else if (input.ToLower() == "ratedown")
                        {
                            RateDown();
                            writer.WriteLine("rate up");
                            writer.WriteLine("<END>");
                        }
                        else if (input.ToLower() == "rate100")
                        {
                            Rate(100);
                            writer.WriteLine("rate 100");
                            writer.WriteLine("<END>");
                        }
                        else if (input.ToLower() == "auto")
                        {
                            Auto();
                            writer.WriteLine("set to Auto mode");
                            writer.WriteLine("<END>");
                        }
                        else if (input.ToLower() == "jog")
                        {
                            JOG();
                            writer.WriteLine("set to JOG mode");
                            writer.WriteLine("<END>");
                        }
                        else
                        {
                            Exe(input);
                            writer.WriteLine("已執行 CNC 指令: " + input);
                            writer.WriteLine("<END>");
                        }
                    }

                    Console.WriteLine("Client 斷線。");
                }
            }
        }
        cnc.Close(); // 關閉 CNC 連線
        Console.WriteLine("CNC 連線關閉，程式結束。");
    }

    static void Read()
    {
        short result = 0;
        int CurSeq = 0;
        string MainProg = "", CurProg = "", Mode = "", Status = "", Alarm = "", EMG = "";
        result = cnc.READ_status(out MainProg, out CurProg, out CurSeq, out Mode, out Status, out Alarm, out EMG);
        if (result == (short)SyntecRemoteCNC.ErrorCode.NormalTermination)
        {
            Console.WriteLine("Main Program: " + MainProg);
            Console.WriteLine("Current Program: " + CurProg);
            Console.WriteLine("Current Sequence: " + CurSeq);
            Console.WriteLine("Mode: " + Mode);
            Console.WriteLine("Status: " + Status);
        }
        else
        {
            Console.WriteLine("❌ 錯誤讀取 CNC 狀態：" + result);
        }
    }

    static void Exe(string text)
    {
        int[] Mode1 = new int[1] { 1 };
        short result1 = cnc.WRITE_nc_main(text);
        if (result1 != (short)SyntecRemoteCNC.ErrorCode.NormalTermination)
        {
            Console.WriteLine($"❌ 設定主 NC 程式失敗 ({result1})");
            return;
        }

        short result2 = cnc.WRITE_plc_register(15205, 15205, Mode1);
        if (result2 == (short)SyntecRemoteCNC.ErrorCode.NormalTermination)
        {
            Mode1[0] = 0;
            cnc.WRITE_plc_register(15205, 15205, Mode1);
            Console.WriteLine("✅ 成功啟動 CNC 程式: " + text);
        }
        else
        {
            Console.WriteLine("❌ 無法啟動 CNC 程式：" + result2);
        }
    }

    static void var()
    {
        // 要設定的 Macro 編號與對應資料
        //int macroNumbers =  125471;
        //double macroValues =  1 ;

        //// 呼叫函式
        //short result = WRITE_macro_single(macroNumbers, macroValues);

    }

    static void RateUp()
    {
        Rate(10);
    }
    static void RateDown()
    {
        Rate(-10);
    }

    static void Rate(int speed)
    {
        short result = 0;
        int[] Rate = new int[1];
        int[] CurrentMode = new int[1];
        int RateRegister = 0;
        bool AutoMode = true;

        // Add 10 to R15213/15214 to increase rate
        // Get current mode
        result = cnc.READ_plc_register(13, 13, out CurrentMode);
        if (result != (short)SyntecRemoteCNC.ErrorCode.NormalTermination)
        {
            Console.WriteLine(" Error in getting current mode: " + result.ToString());
            return;
        }
        if (CurrentMode[0] == 2)
        {
            RateRegister = 15213;
            AutoMode = true;
        }
        else if (CurrentMode[0] == 4)
        {
            RateRegister = 15214;
            AutoMode = false;
        }
        else return;

        // Increase rate by 10
        result = cnc.READ_plc_register(RateRegister, RateRegister, out Rate);
        if (result != (short)SyntecRemoteCNC.ErrorCode.NormalTermination)
        {
            Console.WriteLine(" Error in reading rate: " + result.ToString());
            return;
        }
        if (Rate[0] < 100)
        {
            Rate[0] += speed;
        }
        result = cnc.WRITE_plc_register(RateRegister, RateRegister, Rate);
        if (result == (short)SyntecRemoteCNC.ErrorCode.NormalTermination)
        {
            if (AutoMode == true)
            {
                Console.WriteLine(" Current Auto mode rate: " + Rate[0].ToString() + "%");
            }
            else
            {
                Console.WriteLine(" Current JOG mode rate: " + Rate[0].ToString() + "%");
            }
        }
        else
        {
            Console.WriteLine(" Error in increasing rate: " + result.ToString());
        }

    }

    static void Auto()
    {
        int[] Mode = new int[1];
        short result = 0;

        Mode[0] = 2;
        result = cnc.WRITE_plc_register(13, 13, Mode);
        if (result == (short)SyntecRemoteCNC.ErrorCode.NormalTermination)
        {
            Console.WriteLine( " Current mode set to Auto");
        }
        else
        {
            Console.WriteLine(" Error in setting Auto mode: " + result.ToString());
        }
    }
    static void JOG()
    {
        int[] Mode = new int[1];
        short result = 0;

        Mode[0] = 4;
        result = cnc.WRITE_plc_register(13, 13, Mode);
        if (result == (short)SyntecRemoteCNC.ErrorCode.NormalTermination)
        {
            Console.WriteLine(" Current mode set to JOG");
        }
        else
        {
            Console.WriteLine(" Error in setting JOG mode: " + result.ToString());
        }
    }
}


