import java.awt.*;
    import javax.swing.*;
 
    public class ColorPicker extends JFrame {
    
       public static void main(String args[]) {
          //new JColorChooserDemo();
       
          Color color=JColorChooser.showDialog(null,"select color",Color.lightGray );
          
          if(color==null)
          {
             System.out.println("-1");
             return;
          }
          String r=""+color.getRed();
          String g=""+color.getGreen();
          String b=""+color.getBlue();
          System.out.print("rgb("+r+","+g+","+b+")");
       }
    }